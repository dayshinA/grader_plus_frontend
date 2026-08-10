import { Search } from "lucide-react";
import type { ReactNode } from "react";

import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

/**
 * The row above every list: a search box, and whatever filters that list has.
 *
 * One component rather than the same flex/`relative`/icon-offset block copied into each list
 * screen — five near-identical copies is exactly how a search box ends up 36px tall on one screen
 * and 44px on the next.
 *
 * Mobile-first: search takes the full width on a phone with the filters wrapping under it, and the
 * two sit on one line from `sm:` up.
 */
export function ListToolbar({
  search,
  onSearchChange,
  placeholder = "Search this list",
  searchLabel,
  filters,
  className,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  /** What the search covers, for screen readers — e.g. "Search schools by code or name". */
  searchLabel: string;
  /** Filter controls for this list, usually one or more `FilterTabs`. */
  filters?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="relative w-full sm:max-w-xs">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={placeholder}
          aria-label={searchLabel}
          className="h-11 pl-9 sm:h-9"
        />
      </div>

      {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
    </div>
  );
}
