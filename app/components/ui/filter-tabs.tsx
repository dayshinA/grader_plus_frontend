import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export interface FilterTabOption<T extends string> {
  id: T;
  label: string;
  /** Optional count after the label, for example how many rows the tab would leave. */
  count?: number;
}

// `aria-pressed` buttons, not a `<select>`: two to four options are worth seeing at a glance.
export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: FilterTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** What this group filters on, for screen readers, e.g. "Filter by status". */
  label: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex items-center gap-1 rounded-lg border border-border p-1", className)}
    >
      {options.map((option) => (
        <Button
          key={option.id}
          type="button"
          variant={value === option.id ? "secondary" : "ghost"}
          size="sm"
          aria-pressed={value === option.id}
          className="h-9 flex-1 cursor-pointer px-2.5 sm:h-7 sm:flex-none"
          onClick={() => onChange(option.id)}
        >
          <span className="truncate">{option.label}</span>
          {option.count !== undefined && (
            <span className="ml-1 tabular-nums text-muted-foreground">{option.count}</span>
          )}
        </Button>
      ))}
    </div>
  );
}
