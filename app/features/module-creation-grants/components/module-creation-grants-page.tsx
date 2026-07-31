import { MoreHorizontal, UserCog, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import { Alert } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { PageHeader } from "~/components/ui/page-header";
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
import { AssignModuleCreationGrantDialog } from "~/features/module-creation-grants/components/assign-module-creation-grant-dialog";
import { ToggleModuleCreationGrantDialog } from "~/features/module-creation-grants/components/toggle-module-creation-grant-dialog";
import { useModuleCreationGrants } from "~/features/module-creation-grants/api/use-module-creation-grants";
import type { ModuleCreationGrantResponse } from "~/features/module-creation-grants/types";
import { useDepartments } from "~/features/departments/api/use-departments";
import { useUsers } from "~/features/users/api/use-users";
import type { UserResponse } from "~/features/users/types";
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

export function ModuleCreationGrantsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const departmentId = searchParams.get("departmentId");

  const { data: departments, isLoading: departmentsLoading } = useDepartments();
  const { data: users } = useUsers();
  const {
    data: grants,
    isLoading: grantsLoading,
    isError,
    error,
  } = useModuleCreationGrants(departmentId ?? undefined);

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignDialogNonce, setAssignDialogNonce] = useState(0);
  const [toggleTarget, setToggleTarget] = useState<ToggleTarget | null>(null);
  const [toast, setToast] = useState<{ id: number; title: string; message: string } | null>(null);

  function showToast(title: string, message: string) {
    setToast({ id: Date.now(), title, message });
  }

  function handleDepartmentChange(id: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("departmentId", id);
        return next;
      },
      { replace: true },
    );
  }

  const selectedDepartment = useMemo(
    () => departments?.find((department) => department.id === departmentId) ?? null,
    [departments, departmentId],
  );
  const departmentNotFound = Boolean(departmentId) && !departmentsLoading && !selectedDepartment;

  const usersById = useMemo(() => {
    const map = new Map<string, UserResponse>();
    for (const user of users ?? []) map.set(user.id, user);
    return map;
  }, [users]);

  const assignableCoordinators = useMemo(() => {
    const grantedCoordinatorIds = new Set((grants ?? []).map((grant) => grant.coordinatorId));
    return (users ?? []).filter(
      (user) =>
        // TODO: dead code — this whole feature folder is deleted in Phase 2
        // (its endpoints no longer exist). Filter relaxed only to compile.
        user.isActive && !grantedCoordinatorIds.has(user.id),
    );
  }, [users, grants]);

  const sortedGrants = useMemo(() => {
    if (!grants) return [];
    return [...grants].sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return (b.grantedAt ?? "").localeCompare(a.grantedAt ?? "");
    });
  }, [grants]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Module Creation Grants"
        icon={UserCog}
        actions={
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
        }
      >
        <div className="max-w-sm">
          <Select value={departmentId ?? undefined} onValueChange={handleDepartmentChange}>
            <SelectTrigger aria-label="Select a department">
              <SelectValue placeholder="Select a department" />
            </SelectTrigger>
            <SelectContent>
              {(departments ?? []).map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                  {!department.isActive ? " (Inactive)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      {departmentNotFound && (
        <Alert
          variant="inline"
          status="warning"
          timeout={0}
          title="Department not found"
          message="That department could not be found — pick one below."
        />
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

      {!departmentId || departmentNotFound ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
          Select a department to view and manage its module-creation grants.
        </div>
      ) : (
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
                  const coordinator = usersById.get(grant.coordinatorId);
                  const grantedByUser = grant.grantedBy ? usersById.get(grant.grantedBy) : null;
                  const revokedByUser = grant.revokedBy ? usersById.get(grant.revokedBy) : null;
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
      )}

      {selectedDepartment && (
        <AssignModuleCreationGrantDialog
          key={assignDialogNonce}
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          departmentId={selectedDepartment.id}
          departmentName={selectedDepartment.name}
          eligibleCoordinators={assignableCoordinators}
          onSuccess={(grant, apiMessage) => {
            const coordinator = usersById.get(grant.coordinatorId);
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
          const coordinator = usersById.get(grant.coordinatorId);
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
