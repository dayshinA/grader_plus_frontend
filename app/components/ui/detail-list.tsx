import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

export interface DetailListItem {
  /** Stable key, and the field's label. */
  label: string;
  value: ReactNode;
  /** Spans both columns from `sm:` up — for a long value like an address or a key. */
  wide?: boolean;
}

/**
 * The label/value block a detail screen is mostly made of, as a real `<dl>` so a screen reader
 * announces each value with the field it belongs to.
 *
 * Mobile-first: one field per row with the label above its value, because two columns at 375px
 * leaves neither side room to breathe. From `sm:` the label moves into a fixed-width first column
 * so the values line up into a scannable edge.
 */
export function DetailList({
  items,
  className,
}: {
  items: DetailListItem[];
  className?: string;
}) {
  return (
    <dl className={cn("divide-y divide-border", className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "py-3 first:pt-0 last:pb-0",
            !item.wide && "sm:grid sm:grid-cols-[minmax(9rem,14rem)_1fr] sm:gap-4",
          )}
        >
          <dt className="text-sm text-muted-foreground">{item.label}</dt>
          <dd className="mt-1 min-w-0 text-sm break-words text-foreground sm:mt-0">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
