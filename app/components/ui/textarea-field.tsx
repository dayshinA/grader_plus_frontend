import * as React from "react";

import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

export interface TextareaFieldProps
  extends Omit<React.ComponentProps<"textarea">, "id"> {
  label: string;
  /** Validation message. Usually the API's own text, via `ApiError.fieldError(name)`. */
  error?: string;
  /** Guidance shown when there is no error. An error replaces it, so both never compete. */
  hint?: string;
  id?: string;
}

// The multi-line field. Height grows with `field-sizing-content`, so pass `rows` to start taller.
function TextareaField({
  label,
  error,
  hint,
  id,
  className,
  ...props
}: TextareaFieldProps) {
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;
  const message = error ?? hint;

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>{label}</Label>

      <Textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={className}
        {...props}
      />

      {message && (
        <p
          id={messageId}
          role={error ? "alert" : undefined}
          className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}
        >
          {message}
        </p>
      )}
    </div>
  );
}

export { TextareaField };
