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
import { useAuth } from "~/features/auth/api/auth-context";
import { PermissionGate } from "~/features/permissions/components/permission-gate";
import type { UserRoleAssignmentDetail } from "~/features/permissions/types";
import { bestHierarchyLevel } from "~/features/permissions/utils";
import { useDelegationCandidates } from "~/features/role-assignments/api/use-delegation-candidates";
import { useScopeOptions } from "~/features/role-assignments/api/use-scope-options";
import { useUserRoleAssignments } from "~/features/role-assignments/api/use-user-role-assignments";
import { GrantRoleDialog } from "~/features/role-assignments/components/grant-role-dialog";
import { ManageExtrasDialog } from "~/features/role-assignments/components/manage-extras-dialog";
import { RevokeRoleAssignmentDialog } from "~/features/role-assignments/components/revoke-role-assignment-dialog";
import {
  canRevokeAssignment,
  roleAssignmentErrorMessage,
  SCOPE_TYPE_LABELS,
} from "~/features/role-assignments/utils";

/** Level 3 (Project Coordinator / Marker) is the floor of the hierarchy. */
const HIERARCHY_FLOOR = 3;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * The single delegation surface — one screen replacing the three grant screens
 * deleted in CH-06/07/08 (School Admin grants, Department Admin grants, Module
 * creation grants), whose twelve endpoints no longer exist.
 *
 * Reachable two ways: from the nav, and via `?userId=` deep-linked from a user
 * row on `/super-admin/users` (decision #41, wired in Phase 3). The URL param is
 * the same pattern as `?schoolId=`/`?departmentId=` (decision #32).
 *
 * ⚠️ Everything gated here is UX. Rules 1 and 2 are enforced server-side on
 * every write regardless of what this screen offers.
 */
export function RoleAssignmentsPage() {
  return (
    <PermissionGate
      permissions={["roles.assign", "roles.view"]}
      title="Role Assignments"
      icon={ShieldCheck}
      message="Only accounts that can delegate roles have access to this screen."
    >
      <RoleAssignmentsContent />
    </PermissionGate>
  );
}

function RoleAssignmentsContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const userId = searchParams.get("userId");

  const { permissions: summary } = useAuth();
  const { candidates, isCoordinatorsOnly, isLoading: candidatesLoading } =
    useDelegationCandidates();
  const { optionsByScopeType, sources } = useScopeOptions();
  const {
    data: assignments,
    isLoading: assignmentsLoading,
    isError,
    error,
  } = useUserRoleAssignments(userId ?? undefined);

  const [grantOpen, setGrantOpen] = useState(false);
  const [grantNonce, setGrantNonce] = useState(0);
  const [revokeTarget, setRevokeTarget] = useState<UserRoleAssignmentDetail | null>(null);
  const [extrasTarget, setExtrasTarget] = useState<UserRoleAssignmentDetail | null>(null);
  const [toast, setToast] = useState<{ id: number; title: string; message: string } | null>(
    null,
  );

  function showToast(title: string, message: string) {
    setToast({ id: Date.now(), title, message });
  }

  function handleUserChange(nextUserId: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("userId", nextUserId);
        return next;
      },
      { replace: true },
    );
  }

  const selectedUser = useMemo(
    () => candidates.find((candidate) => candidate.id === userId) ?? null,
    [candidates, userId],
  );

  // A deep link can name someone the current grantor can't enumerate (a Super
  // Admin's link opened by a School Admin, say). The assignments call still
  // works — it only needs `roles.view` — so the screen stays usable and just
  // can't show a name.
  const targetName = selectedUser?.fullName ?? (userId ? "This user" : "");

  const scopeLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const [scopeType, options] of Object.entries(optionsByScopeType)) {
      for (const option of options) map.set(`${scopeType}:${option.id}`, option.label);
    }
    return map;
  }, [optionsByScopeType]);

  function scopeLabelFor(assignment: UserRoleAssignmentDetail): string {
    if (assignment.scopeType === "global") return "Everywhere";
    const named = scopeLabels.get(`${assignment.scopeType}:${assignment.scopeId}`);
    return named ?? SCOPE_TYPE_LABELS[assignment.scopeType];
  }

  // Level 3 can delegate nothing, anywhere — the hierarchy has no rung below
  // it. That's a permanent state, not a loading one, so it replaces the screen
  // rather than showing an empty picker.
  const grantorLevel = bestHierarchyLevel(summary);
  const isAtHierarchyFloor = grantorLevel === null || grantorLevel >= HIERARCHY_FLOOR;

  const sortedAssignments = useMemo(() => {
    if (!assignments) return [];
    return [...assignments].sort(
      (a, b) =>
        a.hierarchyLevel - b.hierarchyLevel ||
        a.roleTemplateName.localeCompare(b.roleTemplateName),
    );
  }, [assignments]);

  if (isAtHierarchyFloor) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Role Assignments" icon={ShieldCheck} />
        <Alert
          variant="inline"
          status="info"
          timeout={0}
          title="You can't delegate roles"
          message="Roles can only be given to someone more junior than yourself, and yours is already the most junior in the system. A School or Department Admin can assign roles within their own area."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Role Assignments"
        icon={ShieldCheck}
        actions={
          <Button
            onClick={() => {
              setGrantOpen(true);
              setGrantNonce((n) => n + 1);
            }}
            disabled={!userId}
          >
            <UserPlus className="h-4 w-4" />
            Assign a role
          </Button>
        }
      >
        <div className="max-w-sm">
          <Select value={userId ?? undefined} onValueChange={handleUserChange}>
            <SelectTrigger aria-label="Select a user">
              <SelectValue
                placeholder={candidatesLoading ? "Loading..." : "Select a user"}
              />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((candidate) => (
                <SelectItem key={candidate.id} value={candidate.id}>
                  {candidate.fullName}
                  {candidate.isActive === false ? " (Deactivated)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      {isCoordinatorsOnly && (
        <Alert
          variant="inline"
          status="info"
          timeout={0}
          title="Showing existing Coordinators only"
          message="Your account can list Project Coordinators, not every user. To give a role to someone who isn't a Coordinator yet, create their account with the role attached from the Users screen."
        />
      )}

      {isError && (
        <Alert
          variant="inline"
          status="error"
          timeout={0}
          title="Couldn't load this user's roles"
          message={roleAssignmentErrorMessage(error)}
        />
      )}

      {!userId ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          Select a user to see and manage the roles they hold.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Role</TableHead>
                <TableHead>Applies to</TableHead>
                <TableHead>Extra permissions</TableHead>
                <TableHead>Granted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignmentsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Loading roles...
                  </TableCell>
                </TableRow>
              ) : sortedAssignments.length ? (
                sortedAssignments.map((assignment) => {
                  const canRevoke = canRevokeAssignment(summary, assignment, sources);
                  const extras = assignment.extraPermissionKeys;

                  return (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        <div>{assignment.roleTemplateName}</div>
                        <div className="text-xs text-muted-foreground">
                          {assignment.permissionKeys.length} permission
                          {assignment.permissionKeys.length === 1 ? "" : "s"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{scopeLabelFor(assignment)}</div>
                        {/* The scope type is only worth a second line when it
                            adds something. For global the name *is* the type
                            ("Everywhere"), so repeating it just reads as a
                            rendering bug. */}
                        {assignment.scopeType !== "global" && (
                          <div className="text-xs text-muted-foreground">
                            {SCOPE_TYPE_LABELS[assignment.scopeType]}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {extras.length === 0 ? (
                          <span className="text-xs text-muted-foreground">None</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {extras.map((key) => (
                              <Badge
                                key={key}
                                variant="outline"
                                className="font-mono text-[10px]"
                              >
                                {key}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(assignment.grantedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Actions for ${assignment.roleTemplateName}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {/* Rule 2 governs revocation and extras too — a
                                grantor who doesn't outrank this assignment
                                can't touch it, so the actions are hidden
                                rather than shown and rejected. */}
                            {canRevoke ? (
                              <>
                                <DropdownMenuItem
                                  onSelect={() => setExtrasTarget(assignment)}
                                >
                                  Extra permissions
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => setRevokeTarget(assignment)}
                                >
                                  Revoke
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem disabled>
                                You don't outrank this role
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {targetName} holds no roles yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {userId && (
        <GrantRoleDialog
          key={grantNonce}
          open={grantOpen}
          onOpenChange={setGrantOpen}
          targetUserId={userId}
          targetUserName={targetName}
          onSuccess={(_assignment, apiMessage) =>
            showToast(apiMessage, `${targetName}'s roles have been updated.`)
          }
        />
      )}

      <RevokeRoleAssignmentDialog
        assignment={revokeTarget}
        scopeLabel={revokeTarget ? scopeLabelFor(revokeTarget) : ""}
        targetUserName={targetName}
        open={revokeTarget !== null}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        onSuccess={(_assignment, apiMessage) =>
          showToast(apiMessage, `${targetName} no longer holds that role.`)
        }
      />

      <ManageExtrasDialog
        assignment={
          // Kept in sync with the refreshed list so the dialog reflects a
          // just-added extra without being reopened.
          extrasTarget
            ? (sortedAssignments.find((a) => a.id === extrasTarget.id) ?? extrasTarget)
            : null
        }
        scopeLabel={extrasTarget ? scopeLabelFor(extrasTarget) : ""}
        targetUserName={targetName}
        open={extrasTarget !== null}
        onOpenChange={(open) => !open && setExtrasTarget(null)}
        onChanged={(apiMessage) =>
          showToast(apiMessage, `${targetName}'s extra permissions have been updated.`)
        }
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
