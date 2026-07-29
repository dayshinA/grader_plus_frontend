import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type { DashboardStudentEntry, MarkingStatus } from "~/features/dashboard/types";

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

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Marker</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {student && student.markers.length > 0 ? (
              student.markers.map((marker) => (
                <TableRow key={marker.markerId}>
                  <TableCell>
                    <div className="font-medium">{marker.markerFullName}</div>
                    <div className="text-xs text-muted-foreground">{marker.markerEmail}</div>
                  </TableCell>
                  <TableCell className="capitalize">{marker.assignmentRole}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(marker.status)}>
                      {statusLabel(marker.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateTime(marker.submittedAt)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                  No markers assigned yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
