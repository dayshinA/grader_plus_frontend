import { useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { DataTable, type DataTableColumn } from "~/components/ui/data-table";

interface DemoStudent {
  id: number;
  name: string;
  studentCode: string;
  status: "complete" | "in_progress" | "not_started";
  marked: string;
}

const rows: DemoStudent[] = [
  { id: 1, name: "Amara Osei", studentCode: "B812344", status: "complete", marked: "3/3" },
  { id: 2, name: "Daniel Whitfield", studentCode: "B819021", status: "in_progress", marked: "1/3" },
  { id: 3, name: "Priya Raghavan", studentCode: "B803778", status: "not_started", marked: "0/3" },
];

function statusBadge(status: DemoStudent["status"]) {
  if (status === "complete") return <Badge variant="success">Complete</Badge>;
  if (status === "in_progress") return <Badge variant="warning">In progress</Badge>;
  return <Badge variant="outline">Not started</Badge>;
}

const columns: DataTableColumn<DemoStudent>[] = [
  {
    id: "student",
    header: "Student",
    cell: (row) => (
      <div className="min-w-0">
        <div className="truncate font-medium text-foreground">{row.name}</div>
        <div className="truncate text-xs text-muted-foreground">{row.studentCode}</div>
      </div>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: (row) => statusBadge(row.status),
  },
  {
    id: "marked",
    header: "Marked",
    align: "end",
    cell: (row) => <span className="font-medium tabular-nums">{row.marked}</span>,
  },
];

export function DataTableDemo() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        size="sm"
        className="cursor-pointer"
        onClick={() => setLoading((value) => !value)}
      >
        {loading ? "Show rows" : "Show loading state"}
      </Button>

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        isLoading={loading}
        skeletonRows={3}
        caption="Example marking-progress list"
        renderCard={(row) => (
          <div className="rounded-xl border border-border p-4">
            <div className="truncate font-medium">{row.name}</div>
            <div className="truncate text-xs text-muted-foreground">{row.studentCode}</div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              {statusBadge(row.status)}
              <span className="text-sm font-medium tabular-nums">{row.marked} marked</span>
            </div>
          </div>
        )}
      />
      <p className="text-xs text-muted-foreground">
        Narrow the window past <code>md</code> to see the same rows render as cards.
      </p>
    </div>
  );
}
