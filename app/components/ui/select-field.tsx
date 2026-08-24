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

// `FormField` for a choice. `container` is there because a dialog select must portal into it.
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
  /** Guidance shown when there is no error. An error replaces it, so both never compete. */
  hint?: string;
  id?: string;
  disabled?: boolean;
  container?: HTMLElement | null;
  className?: string;
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
