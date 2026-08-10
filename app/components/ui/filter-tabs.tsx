import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export interface FilterTabOption<T extends string> {
  /** The value this tab selects, and its React key. */
  id: T;
  label: string;
  /** Optional count shown after the label — e.g. how many rows the tab would leave. */
  count?: number;
}

/**
 * The segmented control every list screen filters with — status on Clients, status *and* gateway
 * on Collections.
 *
 * A real `role="group"` of `aria-pressed` buttons rather than a `<select>`: with two to four
 * options the choices are worth seeing without opening anything, and on a phone a row of chips is
 * one tap instead of three. Below `sm:` the tabs stretch to fill the row so each is a 36px target;
 * from `sm:` they shrink to their labels and sit inline with the search box.
 */
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
  /** What this group filters on, for screen readers — e.g. "Filter by status". */
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
