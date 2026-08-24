import { ArrowRight } from "lucide-react";

import { cn } from "~/lib/utils";

export type ChangeSummaryItem = {
  label: string;
  // Omit the key when nothing is being replaced. An empty string renders as "Not set".
  from?: React.ReactNode;
  to: React.ReactNode;
};

// One row per field, `old -> new`, so the admin need not trust their memory.
export function ChangeSummary({
  items,
  caption,
  className,
}: {
  items: ChangeSummaryItem[];
  /** An optional line under the rows, for example what the API actually receives. */
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

/** A blank value reads as "Not set". An empty gap next to an arrow looks like a bug. */
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
