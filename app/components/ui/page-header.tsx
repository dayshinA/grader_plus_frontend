import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

/**
 * The title block every admin screen opens with: what this screen is, one line on why, and the
 * screen's primary actions.
 *
 * Mobile-first — the actions stack full-width under the title on a phone (where they're thumb
 * targets) and move up beside it from `sm:`.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {description && (
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
