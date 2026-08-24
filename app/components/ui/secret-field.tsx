import { useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

/** Masks to the same length as the real value so revealing does not resize the box. */
function mask(value: string): string {
  return "•".repeat(Math.min(value.length, 48));
}

// A generated temporary password. Masked per render, so navigating back re-hides it.
export function SecretField({
  value,
  label,
  maskable = true,
  copyLabel = "Copy",
  emptyText = "Not available.",
  className,
}: {
  value: string | null | undefined;
  /** Names the value in the copy and reveal buttons' accessible labels. */
  label: string;
  maskable?: boolean;
  copyLabel?: string;
  emptyText?: string;
  className?: string;
}) {
  const [revealed, setRevealed] = useState(!maskable);
  const [copied, setCopied] = useState(false);

  if (!value) {
    return <p className={cn("text-sm text-muted-foreground", className)}>{emptyText}</p>;
  }

  async function handleCopy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied.`);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access is denied outside a secure context. It is on screen to copy by hand.
      toast.error("Couldn't copy automatically. Select the value and copy it.");
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="rounded-lg border border-border bg-muted/40 p-3">
        <code
          className={cn(
            "block font-mono text-sm break-all text-foreground",
            !revealed && "text-muted-foreground select-none",
          )}
        >
          {revealed ? value : mask(value)}
        </code>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {maskable && (
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 cursor-pointer sm:h-9 sm:flex-none"
            onClick={() => setRevealed((current) => !current)}
            aria-pressed={revealed}
          >
            {revealed ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
            {revealed ? "Hide" : "Reveal"}
            <span className="sr-only"> {label}</span>
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 cursor-pointer sm:h-9 sm:flex-none"
          onClick={() => void handleCopy()}
        >
          {copied ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
          {copied ? "Copied" : copyLabel}
          <span className="sr-only"> {label}</span>
        </Button>
      </div>
    </div>
  );
}
