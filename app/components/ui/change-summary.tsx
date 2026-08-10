import { ArrowRight } from "lucide-react";

import { cn } from "~/lib/utils";

export type ChangeSummaryItem = {
  /** What is changing — the field's own name, as the form labels it. */
  label: string;
  /**
   * The value as it stands now. Omit the key entirely for something being set for the first time
   * (creating a record, crediting a wallet): the row then shows only the new value, with no arrow
   * pointing away from nothing. Pass an empty string for a field that is genuinely blank today —
   * it renders as "Not set" rather than as a struck-through nothing.
   */
  from?: React.ReactNode;
  /** The value once the admin confirms. */
  to: React.ReactNode;
};

/**
 * The "what exactly am I about to change" block inside a confirmation dialog: one row per field,
 * each reading `old → new`.
 *
 * It exists because a confirmation that only says "Save these changes?" makes the admin trust
 * their own memory of what they typed. Money moves off these screens — a fee rate, an account
 * number customers wire to — so the dialog restates the change rather than describing it.
 *
 * Mobile-first: the two values wrap onto their own lines at ~375px instead of being clipped, and
 * long values (an account number, an email) break rather than forcing the dialog wide.
 */
export function ChangeSummary({
  items,
  caption,
  className,
}: {
  items: ChangeSummaryItem[];
  /** An optional line under the rows — e.g. what the API actually receives. */
  caption?: React.ReactNode;
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/40 p-3 text-left text-sm",
        className,
      )}
    >
      <dl className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="space-y-1">
            <dt className="text-xs font-medium text-muted-foreground">{item.label}</dt>
            <dd className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              {"from" in item && (
                <>
                  <Value value={item.from} muted />
                  <ArrowRight
                    className="size-3 shrink-0 self-center text-muted-foreground"
                    aria-hidden="true"
                  />
                  {/* Read aloud, the arrow is silent — say what it means. */}
                  <span className="sr-only">changes to</span>
                </>
              )}
              <Value value={item.to} />
            </dd>
          </div>
        ))}
      </dl>

      {caption && <p className="mt-3 text-xs text-muted-foreground">{caption}</p>}
    </div>
  );
}

/**
 * A blank value is written out as "Not set" instead of struck through: there is nothing to strike,
 * and an empty gap next to an arrow reads as a rendering bug rather than as "this field is empty".
 */
function Value({ value, muted = false }: { value: React.ReactNode; muted?: boolean }) {
  const isBlank = value === undefined || value === null || value === "";

  if (isBlank) {
    return <span className="text-muted-foreground italic">Not set</span>;
  }

  return (
    <span
      className={cn(
        "break-words hyphens-auto",
        muted ? "text-muted-foreground line-through decoration-muted-foreground/60" : "font-medium text-foreground",
      )}
    >
      {value}
    </span>
  );
}
