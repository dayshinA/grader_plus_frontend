import * as React from "react";

import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";

export interface SelectFieldOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * `FormField`'s counterpart for a choice rather than free text: same label + control + message
 * layout, same `aria-invalid`/`aria-describedby`/`role="alert"` wiring, so a form built from both
 * lines up and announces the same way.
 *
 * `container` exists for the same reason it does on `SelectContent` — a select inside a dialog
 * has to portal into the dialog's own node.
 */
export function SelectField({
  label,
  value,
  onValueChange,
  options,
  placeholder = "Select an option",
  error,
  hint,
  id,
  disabled,
  container,
  className,
  emptyText = "Nothing to choose from.",
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectFieldOption[];
  placeholder?: string;
  /** Validation message. Usually the API's own text, via `ApiError.fieldError(name)`. */
  error?: string;
  /** Guidance shown when there's no error — an error replaces it, so both never compete. */
  hint?: string;
  id?: string;
  disabled?: boolean;
  container?: HTMLElement | null;
  className?: string;
  /** Shown in place of the list when there is nothing to pick. */
  emptyText?: string;
}) {
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;
  const message = error ?? hint;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={fieldId}>{label}</Label>

      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent container={container}>
          {options.length === 0 ? (
            <p className="px-1.5 py-2 text-sm text-muted-foreground">{emptyText}</p>
          ) : (
            options.map((option) => (
              <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

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
