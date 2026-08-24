import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

export interface DetailListItem {
  label: string;
  value: ReactNode;
  /** Spans both columns from `sm:` up, for a long value. */
  wide?: boolean;
}

// A real `<dl>`. One field per row on a phone, label in a fixed column from `sm:` up.
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
