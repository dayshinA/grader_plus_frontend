import { useId, useState } from "react";

import { FileInput } from "~/components/ui/file-input";
import { Label } from "~/components/ui/label";

export default function FileInputPreview() {
  const basicId = useId();
  const disabledId = useId();

  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6 sm:p-10">
      <h1 className="text-lg font-semibold text-foreground">FileInput — manual QA preview</h1>

      <section className="flex flex-col gap-2">
        <Label htmlFor={basicId}>CSV / Excel picker (2MB cap)</Label>
        <FileInput
          id={basicId}
          accept={[".csv", ".xlsx"]}
          maxSizeBytes={2 * 1024 * 1024}
          onFileSelect={(selected) => {
            setFile(selected);
            setError(null);
          }}
          onError={setError}
        />
        {error && (
          <p className="text-xs text-destructive" role="alert" aria-live="polite">
            {error}
          </p>
        )}
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Selected: {file ? file.name : "none"}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <Label htmlFor={disabledId}>Disabled</Label>
        <FileInput
          id={disabledId}
          accept={[".csv", ".xlsx"]}
          maxSizeBytes={2 * 1024 * 1024}
          onFileSelect={() => {}}
          disabled
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Keyboard + drag check</h2>
        <p className="text-sm text-muted-foreground">
          Tab to the picker above and press Enter/Space to open the file dialog. Dragging a file
          over the dashed box should highlight its border. Try uploading a `.png` or a file over
          2MB to see the client-side rejection message.
        </p>
      </section>
    </div>
  );
}
