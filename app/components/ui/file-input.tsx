import { Upload, X } from "lucide-react";
import * as React from "react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export interface FileInputProps {
  id?: string;
  /** Accepted extensions, for example `[".csv", ".xlsx"]`. Matched case-insensitively. */
  accept: string[];
  /** Size cap in bytes, rejected locally. Should mirror what the endpoint enforces, not exceed it. */
  maxSizeBytes: number;
  /** Called with the chosen file, or null when cleared. A rejected file goes to `onError`. */
  onFileSelect: (file: File | null) => void;
  /** Called when a file fails validation. Does not clear a previously accepted selection. */
  onError?: (message: string) => void;
  disabled?: boolean;
  className?: string;
}

function formatMaxSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(bytes % (1024 * 1024) === 0 ? 0 : 1)}MB`;
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot).toLowerCase();
}

// Uncontrolled: the caller keeps the `File` handed back by `onFileSelect`.
const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  ({ id, accept, maxSizeBytes, onFileSelect, onError, disabled, className }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [isDragActive, setIsDragActive] = React.useState(false);
    const reactId = React.useId();
    const inputId = id ?? reactId;

    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    function validateAndSelect(file: File) {
      const ext = extensionOf(file.name);
      if (!accept.some((accepted) => accepted.toLowerCase() === ext)) {
        onError?.(`"${file.name}" isn't a supported file type. Accepted: ${accept.join(", ")}.`);
        return;
      }
      if (file.size > maxSizeBytes) {
        onError?.(`"${file.name}" is too large. Maximum size is ${formatMaxSize(maxSizeBytes)}.`);
        return;
      }
      setSelectedFile(file);
      onFileSelect(file);
    }

    function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
      const file = event.target.files?.[0];
      if (file) validateAndSelect(file);
      // Reset so choosing the exact same file again still fires onChange.
      event.target.value = "";
    }

    function handleDrop(event: React.DragEvent<HTMLDivElement>) {
      event.preventDefault();
      setIsDragActive(false);
      if (disabled) return;
      const file = event.dataTransfer.files?.[0];
      if (file) validateAndSelect(file);
    }

    function handleClear() {
      setSelectedFile(null);
      onFileSelect(null);
    }

    return (
      <div
        className={cn(
          "flex flex-col items-center gap-2 rounded-lg border border-dashed border-input bg-background px-4 py-6 text-center shadow-sm shadow-black/5 transition-colors",
          isDragActive && "border-ring bg-accent/50",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onKeyDown={(event) => {
          if (!disabled && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={accept.join(",")}
          disabled={disabled}
          onChange={handleInputChange}
          className="sr-only"
        />

        {selectedFile ? (
          <div className="flex w-full items-center justify-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">
              {selectedFile.name}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              aria-label="Remove selected file"
              disabled={disabled}
              onClick={(event) => {
                event.stopPropagation();
                handleClear();
              }}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </div>
        ) : (
          <>
            <Upload className="h-6 w-6 text-muted-foreground/70" aria-hidden />
            <p className="text-sm text-foreground">
              <span className="font-medium">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">
              {accept.join(", ")} — up to {formatMaxSize(maxSizeBytes)}
            </p>
          </>
        )}
      </div>
    );
  },
);
FileInput.displayName = "FileInput";

export { FileInput };
