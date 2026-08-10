import { Users } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { DataTable, type DataTableColumn } from "~/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import type { DashboardStudentEntry, MarkingStatus } from "~/features/dashboard/types";

type MarkerRow = DashboardStudentEntry["markers"][number];

interface StudentMarkersDialogProps {
  student: DashboardStudentEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusBadgeVariant(status: MarkingStatus): "success" | "warning" | "outline" {
  if (status === "final") return "success";
  if (status === "draft") return "warning";
  return "outline";
}

function statusLabel(status: MarkingStatus): string {
  if (status === "final") return "Final";
  if (status === "draft") return "Draft";
  return "Not started";
}

export function StudentMarkersDialog({ student, open, onOpenChange }: StudentMarkersDialogProps) {
  const columns: DataTableColumn<MarkerRow>[] = [
    {
      id: "marker",
      header: "Marker",
      cell: (marker) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{marker.markerFullName}</p>
          <p className="truncate text-xs text-muted-foreground">{marker.markerEmail}</p>
        </div>
      ),
    },
    {
      id: "role",
      header: "Role",
      cell: (marker) => (
        <span className="capitalize text-muted-foreground">{marker.assignmentRole}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (marker) => (
        <Badge variant={statusBadgeVariant(marker.status)}>{statusLabel(marker.status)}</Badge>
      ),
    },
    {
      id: "submitted",
      header: "Submitted",
      align: "end",
      cell: (marker) => (
        <span className="tabular-nums text-muted-foreground">
          {formatDateTime(marker.submittedAt)}
        </span>
      ),
      className: "hidden sm:table-cell",
    },
  ];

  const renderCard = (marker: MarkerRow) => (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{marker.markerFullName}</p>
          <p className="truncate text-xs capitalize text-muted-foreground">
            {marker.assignmentRole}
          </p>
        </div>
        <Badge variant={statusBadgeVariant(marker.status)}>{statusLabel(marker.status)}</Badge>
      </div>
      <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
        Submitted {formatDateTime(marker.submittedAt)}
      </p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{student ? `Markers for ${student.fullName}` : "Markers"}</DialogTitle>
          {student && (
            <DialogDescription>
              {student.projectTitle} · {student.studentCode}
            </DialogDescription>
          )}
        </DialogHeader>

        <DataTable
          columns={columns}
          rows={student?.markers ?? []}
          getRowId={(marker) => marker.markerId}
          renderCard={renderCard}
          caption="Markers assigned to this project and how far each has got"
          empty={
            <Empty className="px-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No markers assigned</EmptyTitle>
                <EmptyDescription>
                  Nobody has been assigned to mark this project yet.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          }
        />
      </DialogContent>
    </Dialog>
  );
}
