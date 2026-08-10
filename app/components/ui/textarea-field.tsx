import * as React from "react";

import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

export interface TextareaFieldProps
  extends Omit<React.ComponentProps<"textarea">, "id"> {
  label: string;
  /** Validation message. Usually the API's own text, via `ApiError.fieldError(name)`. */
  error?: string;
  /** Guidance shown when there's no error — an error replaces it, so both never compete. */
  hint?: string;
  id?: string;
}

/**
 * The multi-line member of the field trio, alongside `FormField` (text) and `SelectField`
 * (choice) — same label + control + message layout and the same `aria-invalid` /
 * `aria-describedby` / `role="alert"` wiring, so a form built from all three lines up visually and
 * announces identically to a screen reader.
 *
 * Added 2026-08-10 for the rubric criterion's description, which is the first genuinely long-form
 * input in the app. Built now rather than inlining a `Label` + `Textarea` pair at that one call
 * site, because hand-wiring the accessibility attributes per form is exactly what `FormField`
 * exists to stop.
 *
 * Height is left to `Textarea`'s own `field-sizing-content` (it grows with what's typed) — pass
 * `rows` for a taller starting point.
 */
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
