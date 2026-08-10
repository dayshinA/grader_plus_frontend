import { useState } from "react";

import { FilterTabs, type FilterTabOption } from "~/components/ui/filter-tabs";

type Status = "all" | "pending" | "success" | "failed";
type Gateway = "all" | "beta" | "alpha" | "gamma";

const STATUS: FilterTabOption<Status>[] = [
  { id: "all", label: "All", count: 20 },
  { id: "pending", label: "Pending", count: 3 },
  { id: "success", label: "Successful", count: 16 },
  { id: "failed", label: "Failed", count: 1 },
];

const GATEWAY: FilterTabOption<Gateway>[] = [
  { id: "all", label: "All" },
  { id: "beta", label: "Beta" },
  { id: "alpha", label: "Alpha" },
  { id: "gamma", label: "Bank transfer" },
];

export function FilterTabsDemo() {
  const [status, setStatus] = useState<Status>("all");
  const [gateway, setGateway] = useState<Gateway>("all");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <FilterTabs
          options={STATUS}
          value={status}
          onChange={setStatus}
          label="Filter by status"
        />
        <FilterTabs
          options={GATEWAY}
          value={gateway}
          onChange={setGateway}
          label="Filter by payment method"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Filtering on <strong>{status}</strong> · <strong>{gateway}</strong>. Narrow the window past{" "}
        <code>sm</code> to see the tabs stretch into full-width tap targets.
      </p>
    </div>
  );
}
