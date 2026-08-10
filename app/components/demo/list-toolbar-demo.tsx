import { useState } from "react";

import { FilterTabs, type FilterTabOption } from "~/components/ui/filter-tabs";
import { ListToolbar } from "~/components/ui/list-toolbar";

type StatusFilter = "all" | "active" | "inactive";

const STATUS_FILTERS: FilterTabOption<StatusFilter>[] = [
  { id: "all", label: "All", count: 42 },
  { id: "active", label: "Active", count: 38 },
  { id: "inactive", label: "Inactive", count: 4 },
];

/** The row above every list screen: search on the left, that list's filters on the right. */
export function ListToolbarDemo() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  return (
    <div className="space-y-4">
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search by code or name"
        searchLabel="Search modules by code or name"
        filters={
          <FilterTabs
            options={STATUS_FILTERS}
            value={status}
            onChange={setStatus}
            label="Filter by status"
          />
        }
      />
      <p className="text-sm text-muted-foreground">
        Filtering on <span className="font-medium text-foreground">{status}</span>
        {search.trim() && (
          <>
            {" "}
            matching <span className="font-medium text-foreground">{search.trim()}</span>
          </>
        )}
        .
      </p>
    </div>
  );
}
