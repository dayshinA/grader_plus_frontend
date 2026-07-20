import { MoreHorizontal, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useDepartmentCoordinators } from "~/features/departments/api/use-department-coordinators";
import { useDepartments } from "~/features/departments/api/use-departments";
import type { CoordinatorResponse } from "~/features/departments/types";
import { AssignModuleCreationGrantDialog } from "~/features/module-creation-grants/components/assign-module-creation-grant-dialog";
import { ToggleModuleCreationGrantDialog } from "~/features/module-creation-grants/components/toggle-module-creation-grant-dialog";
import { useModuleCreationGrants } from "~/features/module-creation-grants/api/use-module-creation-grants";
import type { ModuleCreationGrantResponse } from "~/features/module-creation-grants/types";
import { ApiError } from "~/lib/api-client";

type ToggleTarget = ModuleCreationGrantResponse & { coordinatorName: string };

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * The FR40 delegation surface for a Department Admin — grants/revokes module-creation
 * permission for coordinators in departments *they administer*, via `GET/POST/DELETE
 * /departments/:departmentId/module-creation-grants` (delegable to a Coordinator who passes
 * `DepartmentAdminGuard`, unlike `ModuleCreationGrantsPage`'s Super-Admin-only screen which
 * this shares its dialogs with). The department picker below is intentionally local
 * `useState`, not the `?departmentId=` URL-param pattern `ModuleCreationGrantsPage` uses
 * (decision #32) — nothing deep-links into this tab yet, so there's no bookmarkable state to
 * preserve.
 */
export function DelegateModuleCreationPanel() {
  const { data: departments } = useDepartments();
  const adminDepartments = useMemo(
    () => (departments ?? []).filter((department) => department.isAdmin === true),
    [departments],
  );

  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | undefined>(
    undefined,
  );
  // Default to the first administered department (the common case is exactly one) until the
  // caller explicitly picks another.
  const departmentId = selectedDepartmentId ?? adminDepartments[0]?.id;
  const selectedDepartment = adminDepartments.find((department) => department.id === departmentId);

  const { data: coordinators } = useDepartmentCoordinators(departmentId);
  const {
    data: grants,
    isLoading: grantsLoading,
    isError,
    error,
  } = useModuleCreationGrants(departmentId);

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignDialogNonce, setAssignDialogNonce] = useState(0);
  const [toggleTarget, setToggleTarget] = useState<ToggleTarget | null>(null);
  const [toast, setToast] = useState<{ id: number; title: string; message: string } | null>(null);

  function showToast(title: string, message: string) {
    setToast({ id: Date.now(), title, message });
  }

  const coordinatorsById = useMemo(() => {
    const map = new Map<string, CoordinatorResponse>();
    for (const coordinator of coordinators ?? []) map.set(coordinator.id, coordinator);
    return map;
  }, [coordinators]);

  const assignableCoordinators = useMemo(() => {
    const grantedCoordinatorIds = new Set((grants ?? []).map((grant) => grant.coordinatorId));
    return (coordinators ?? [])
      .filter((coordinator) => !grantedCoordinatorIds.has(coordinator.id))
      .map((coordinator) => ({
        id: coordinator.id,
        label: `${coordinator.fullName} (${coordinator.email})`,
      }));
  }, [coordinators, grants]);

  const sortedGrants = useMemo(() => {
    if (!grants) return [];
    return [...grants].sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return (b.grantedAt ?? "").localeCompare(a.grantedAt ?? "");
    });
  }, [grants]);

  if (adminDepartments.length === 0) {
    return (
      <Alert
        variant="inline"
        status="info"
        timeout={0}
        title="No department to delegate in"
        message="You don't administer any department yet — ask a Super Admin to grant you Department Admin access first."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Delegate module creation</h2>
          <p className="text-sm text-muted-foreground">
            Let another coordinator create new modules in a department you administer.
          </p>
        </div>
        <Button
          onClick={() => {
            setAssignDialogOpen(true);
            setAssignDialogNonce((n) => n + 1);
          }}
          disabled={!selectedDepartment}
        >
          <UserPlus className="h-4 w-4" />
          Grant module creation
        </Button>
      </div>

      {adminDepartments.length > 1 && (
        <div className="max-w-sm">
          <Select value={departmentId} onValueChange={setSelectedDepartmentId}>
            <SelectTrigger aria-label="Select a department">
              <SelectValue placeholder="Select a department" />
            </SelectTrigger>
            <SelectContent>
              {adminDepartments.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isError && (
        <Alert
          variant="inline"
          status="error"
          timeout={0}
          title="Couldn't load module creation grants"
          message={
            error instanceof ApiError ? error.message : "Something went wrong. Please try again."
          }
        />
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Coordinator</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Detail</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grantsLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Loading module creation grants...
                </TableCell>
              </TableRow>
            ) : sortedGrants.length ? (
              sortedGrants.map((grant) => {
                const coordinator = coordinatorsById.get(grant.coordinatorId);
                const grantedByUser = grant.grantedBy
                  ? coordinatorsById.get(grant.grantedBy)
                  : null;
                const revokedByUser = grant.revokedBy
                  ? coordinatorsById.get(grant.revokedBy)
                  : null;
                const coordinatorName = coordinator?.fullName ?? grant.coordinatorId;
                const grantedDate = formatDate(grant.grantedAt);
                const revokedDate = formatDate(grant.revokedAt);

                return (
                  <TableRow key={grant.coordinatorId}>
                    <TableCell className="font-medium">
                      <div>{coordinatorName}</div>
                      {coordinator && (
                        <div className="text-xs text-muted-foreground">{coordinator.email}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={grant.isActive ? "default" : "outline"}>
                        {grant.isActive ? "Active" : "Revoked"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {grantedDate && (
                        <div>
                          Granted by {grantedByUser?.fullName ?? "—"} on {grantedDate}
                        </div>
                      )}
                      {revokedDate && (
                        <div>
                          Revoked by {revokedByUser?.fullName ?? "—"} on {revokedDate}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Actions for ${coordinatorName}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => setToggleTarget({ ...grant, coordinatorName })}
                          >
                            {grant.isActive ? "Revoke" : "Re-grant"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No module-creation grant has ever been issued for this department.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedDepartment && (
        <AssignModuleCreationGrantDialog
          key={assignDialogNonce}
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          departmentId={selectedDepartment.id}
          departmentName={selectedDepartment.name}
          eligibleCoordinators={assignableCoordinators}
          onSuccess={(grant, apiMessage) => {
            const coordinator = coordinatorsById.get(grant.coordinatorId);
            showToast(
              apiMessage,
              `${coordinator?.fullName ?? "This coordinator"} can now create new modules in ${selectedDepartment.name}.`,
            );
          }}
        />
      )}

      <ToggleModuleCreationGrantDialog
        grant={toggleTarget}
        open={toggleTarget !== null}
        onOpenChange={(open) => !open && setToggleTarget(null)}
        onSuccess={(action, grant, apiMessage) => {
          const coordinator = coordinatorsById.get(grant.coordinatorId);
          const name = coordinator?.fullName ?? "This coordinator";
          showToast(
            apiMessage,
            action === "revoked"
              ? `${name} can no longer create new modules here — their existing modules are unaffected.`
              : `${name} can create new modules here again.`,
          );
        }}
      />

      {toast && (
        <Alert
          key={toast.id}
          variant="toast"
          status="success"
          title={toast.title}
          reducedMotion
          timeout={6000}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
