import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

export interface FormFieldProps extends Omit<React.ComponentProps<"input">, "id"> {
  label: string;
  /** Validation message. Usually the API's own text, via `ApiError.fieldError(name)`. */
  error?: string;
  /** Guidance shown when there is no error. An error replaces it, so both never compete. */
  hint?: string;
  id?: string;
}

// Label, input and message with the accessibility wiring done once. `h-11` on mobile for the thumb.
function FormField({
  label,
  error,
  hint,
  id,
  className,
  type,
  revealable = true,
  ...props
}: FormFieldProps & { revealable?: boolean }) {
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;
  const [revealed, setRevealed] = React.useState(false);

  const isPassword = type === "password";
  const showToggle = isPassword && revealable;
  const message = error ?? hint;

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>{label}</Label>

      <div className="relative">
        <Input
          id={fieldId}
          type={showToggle && revealed ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={cn("h-11 sm:h-9", showToggle && "pr-11", className)}
          {...props}
        />

        {showToggle && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            // Out of the tab order on purpose: it would sit between the password field and submit.
            tabIndex={-1}
            aria-label={revealed ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {revealed ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

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

export { FormField };
