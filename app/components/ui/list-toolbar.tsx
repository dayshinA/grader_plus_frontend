import { Search } from "lucide-react";
import type { ReactNode } from "react";

import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

// Search and that list's filters. Full width on a phone, one line from `sm:` up.
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
  /** What the search covers, for screen readers, e.g. "Search schools by code or name". */
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
