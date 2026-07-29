import { MoreHorizontal, ShieldCheck, UserPlus } from "lucide-react";
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
import { AssignSchoolAdminDialog } from "~/features/school-admin-grants/components/assign-school-admin-dialog";
import { ToggleSchoolAdminGrantDialog } from "~/features/school-admin-grants/components/toggle-school-admin-grant-dialog";
import { useSchoolAdminGrants } from "~/features/school-admin-grants/api/use-school-admin-grants";
import type { SchoolAdminGrantResponse } from "~/features/school-admin-grants/types";
import { useSchools } from "~/features/schools/api/use-schools";
import { useUsers } from "~/features/users/api/use-users";
import type { UserResponse } from "~/features/users/types";
import { ApiError } from "~/lib/api-client";

type ToggleTarget = SchoolAdminGrantResponse & { coordinatorName: string };

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Super Admin CRUD screen for `school_admin_grants` — direct structural mirror of
 * `DepartmentAdminGrantsPage`, one level up (see SYSTEM_DESIGN.md decision #37), including the
 * `?schoolId=` URL-param pattern from decision #32. */
export function SchoolAdminGrantsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const schoolId = searchParams.get("schoolId");

  const { data: schools, isLoading: schoolsLoading } = useSchools();
  const { data: users } = useUsers();
  const {
    data: grants,
    isLoading: grantsLoading,
    isError,
    error,
  } = useSchoolAdminGrants(schoolId ?? undefined);

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignDialogNonce, setAssignDialogNonce] = useState(0);
  const [toggleTarget, setToggleTarget] = useState<ToggleTarget | null>(null);
  const [toast, setToast] = useState<{ id: number; title: string; message: string } | null>(null);

  function showToast(title: string, message: string) {
    setToast({ id: Date.now(), title, message });
  }

  function handleSchoolChange(id: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("schoolId", id);
        return next;
      },
      { replace: true },
    );
  }

  const selectedSchool = useMemo(
    () => schools?.find((school) => school.id === schoolId) ?? null,
    [schools, schoolId],
  );
  const schoolNotFound = Boolean(schoolId) && !schoolsLoading && !selectedSchool;

  const usersById = useMemo(() => {
    const map = new Map<string, UserResponse>();
    for (const user of users ?? []) map.set(user.id, user);
    return map;
  }, [users]);

  const assignableCoordinators = useMemo(() => {
    const grantedCoordinatorIds = new Set((grants ?? []).map((grant) => grant.coordinatorId));
    return (users ?? []).filter(
      (user) =>
        user.role === "coordinator" && user.isActive && !grantedCoordinatorIds.has(user.id),
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
        title="School Admin Grants"
        icon={ShieldCheck}
        actions={
          <Button
            onClick={() => {
              setAssignDialogOpen(true);
              setAssignDialogNonce((n) => n + 1);
            }}
            disabled={!selectedSchool}
          >
            <UserPlus className="h-4 w-4" />
            Assign School Admin
          </Button>
        }
      >
        <div className="max-w-sm">
          <Select value={schoolId ?? undefined} onValueChange={handleSchoolChange}>
            <SelectTrigger aria-label="Select a school">
              <SelectValue placeholder="Select a school" />
            </SelectTrigger>
            <SelectContent>
              {(schools ?? []).map((school) => (
                <SelectItem key={school.id} value={school.id}>
                  {school.name}
                  {!school.isActive ? " (Inactive)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      {schoolNotFound && (
        <Alert
          variant="inline"
          status="warning"
          timeout={0}
          title="School not found"
          message="That school could not be found — pick one below."
        />
      )}

      {isError && (
        <Alert
          variant="inline"
          status="error"
          timeout={0}
          title="Couldn't load School Admin grants"
          message={
            error instanceof ApiError ? error.message : "Something went wrong. Please try again."
          }
        />
      )}

      {!schoolId || schoolNotFound ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
          Select a school to view and manage its School Admins.
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
                    Loading School Admin grants...
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
                    No School Admin has ever been granted for this school.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedSchool && (
        <AssignSchoolAdminDialog
          key={assignDialogNonce}
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          schoolId={selectedSchool.id}
          schoolName={selectedSchool.name}
          eligibleCoordinators={assignableCoordinators}
          onSuccess={(grant, apiMessage) => {
            const coordinator = usersById.get(grant.coordinatorId);
            showToast(
              apiMessage,
              `${coordinator?.fullName ?? "This coordinator"} can now manage every department and module in ${selectedSchool.name}.`,
            );
          }}
        />
      )}

      <ToggleSchoolAdminGrantDialog
        grant={toggleTarget}
        open={toggleTarget !== null}
        onOpenChange={(open) => !open && setToggleTarget(null)}
        onSuccess={(action, grant, apiMessage) => {
          const coordinator = usersById.get(grant.coordinatorId);
          const name = coordinator?.fullName ?? "This coordinator";
          showToast(
            apiMessage,
            action === "revoked"
              ? `${name} no longer has School Admin oversight here.`
              : `${name} has School Admin oversight here again.`,
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
