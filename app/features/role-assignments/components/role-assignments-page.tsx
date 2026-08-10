import { Info, MoreHorizontal, ShieldCheck, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { DataTable, type DataTableColumn } from "~/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { ErrorCard } from "~/components/ui/error-card";
import { PageHeader } from "~/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useAuth } from "~/features/auth/api/auth-context";
import { findNavItem } from "~/features/dashboard/nav";
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
  permissionTitle,
  SCOPE_TYPE_LABELS,
} from "~/features/role-assignments/utils";

const nav = findNavItem("/super-admin/role-assignments");

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
      description={nav?.description}
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
    refetch,
    isFetching,
  } = useUserRoleAssignments(userId ?? undefined);

  const [grantOpen, setGrantOpen] = useState(false);
  const [grantNonce, setGrantNonce] = useState(0);
  const [revokeTarget, setRevokeTarget] = useState<UserRoleAssignmentDetail | null>(null);
  const [extrasTarget, setExtrasTarget] = useState<UserRoleAssignmentDetail | null>(null);

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
      <div className="space-y-6">
        <PageHeader title="Role Assignments" description={nav?.description} />
        <Card>
          <CardContent className="py-4">
            <Empty className="px-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShieldCheck aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>You can't delegate roles</EmptyTitle>
                <EmptyDescription>
                  Roles can only be given to someone more junior than yourself, and yours is
                  already the most junior in the system. A School or Department Admin can assign
                  roles within their own area.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      </div>
    );
  }

  function rowActions(assignment: UserRoleAssignmentDetail) {
    const canRevoke = canRevokeAssignment(summary, assignment, sources);
    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer"
            aria-label={`Actions for ${assignment.roleTemplateName}`}
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* Rule 2 governs revocation and extras too — a grantor who doesn't outrank this
              assignment can't touch it, so the actions are hidden rather than shown and
              rejected. */}
          {canRevoke ? (
            <>
              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={() => setExtrasTarget(assignment)}
              >
                Extra permissions
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                variant="destructive"
                onSelect={() => setRevokeTarget(assignment)}
              >
                Revoke
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem disabled>You don't outrank this role</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const columns: DataTableColumn<UserRoleAssignmentDetail>[] = [
    {
      id: "role",
      header: "Role",
      cell: (assignment) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{assignment.roleTemplateName}</p>
          <p className="text-xs text-muted-foreground">
            {assignment.permissionKeys.length} permission
            {assignment.permissionKeys.length === 1 ? "" : "s"}
          </p>
        </div>
      ),
      skeletonClassName: "w-36",
    },
    {
      id: "scope",
      header: "Applies to",
      cell: (assignment) => (
        <div className="min-w-0">
          <p className="truncate text-foreground">{scopeLabelFor(assignment)}</p>
          {/* The scope type is only worth a second line when it adds something. For global the
              name *is* the type ("Everywhere"), so repeating it just reads as a rendering bug. */}
          {assignment.scopeType !== "global" && (
            <p className="text-xs text-muted-foreground">
              {SCOPE_TYPE_LABELS[assignment.scopeType]}
            </p>
          )}
        </div>
      ),
      skeletonClassName: "w-32",
    },
    {
      id: "extras",
      header: "Extra permissions",
      cell: (assignment) =>
        assignment.extraPermissionKeys.length === 0 ? (
          <span className="text-xs text-muted-foreground">None</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {assignment.extraPermissionKeys.map((key) => (
              <Badge key={key} variant="outline">
                {permissionTitle(key)}
              </Badge>
            ))}
          </div>
        ),
      className: "hidden lg:table-cell",
      skeletonClassName: "w-28",
    },
    {
      id: "granted",
      header: "Granted",
      cell: (assignment) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatDate(assignment.grantedAt)}
        </span>
      ),
      className: "hidden md:table-cell",
      skeletonClassName: "w-20",
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "end",
      cell: rowActions,
      className: "w-12",
      skeletonClassName: "size-8 rounded-md",
    },
  ];

  const renderCard = (assignment: UserRoleAssignmentDetail) => (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{assignment.roleTemplateName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {scopeLabelFor(assignment)}
            {assignment.scopeType !== "global" &&
              ` · ${SCOPE_TYPE_LABELS[assignment.scopeType]}`}
          </p>
        </div>
        {rowActions(assignment)}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-border pt-3">
        {assignment.extraPermissionKeys.length === 0 ? (
          <span className="text-xs text-muted-foreground">No extra permissions</span>
        ) : (
          assignment.extraPermissionKeys.map((key) => (
            <Badge key={key} variant="outline">
              {permissionTitle(key)}
            </Badge>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role Assignments"
        description={nav?.description}
        actions={
          <Button
            className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto"
            onClick={() => {
              setGrantOpen(true);
              setGrantNonce((n) => n + 1);
            }}
            disabled={!userId}
          >
            <UserPlus aria-hidden="true" />
            Assign a role
          </Button>
        }
      />

      <div className="w-full sm:max-w-sm">
        <Select value={userId ?? undefined} onValueChange={handleUserChange}>
          <SelectTrigger aria-label="Select a user">
            <SelectValue placeholder={candidatesLoading ? "Loading…" : "Select a user"} />
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

      {isCoordinatorsOnly && (
        <div
          role="note"
          className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground"
        >
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Your account can list Project Coordinators, not every user. To give a role to someone
            who isn't a Coordinator yet, create their account with the role attached from the
            Users screen.
          </span>
        </div>
      )}

      {isError ? (
        <ErrorCard
          title="Couldn't load this user's roles"
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      ) : !userId ? (
        <Card>
          <CardContent className="py-4">
            <Empty className="px-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UserPlus aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Pick a user</EmptyTitle>
                <EmptyDescription>
                  Delegation is user-centric: choose someone above to see every role they hold and
                  manage it from one place.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          rows={sortedAssignments}
          getRowId={(assignment) => assignment.id}
          renderCard={renderCard}
          isLoading={assignmentsLoading}
          caption={`Roles held by ${targetName}`}
          empty={
            <Card>
              <CardContent className="py-4">
                <Empty className="px-0">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ShieldCheck aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>No roles yet</EmptyTitle>
                    <EmptyDescription>
                      {targetName} holds no roles yet. Assign one to give them access to a school,
                      department or module.
                    </EmptyDescription>
                  </EmptyHeader>
                  <Button
                    className="h-11 cursor-pointer sm:h-9"
                    onClick={() => {
                      setGrantOpen(true);
                      setGrantNonce((n) => n + 1);
                    }}
                  >
                    <UserPlus aria-hidden="true" />
                    Assign a role
                  </Button>
                </Empty>
              </CardContent>
            </Card>
          }
        />
      )}

      {userId && (
        <GrantRoleDialog
          key={grantNonce}
          open={grantOpen}
          onOpenChange={setGrantOpen}
          targetUserId={userId}
          targetUserName={targetName}
          onSuccess={(_assignment, apiMessage) =>
            toast.success(apiMessage, {
              description: `${targetName}'s roles have been updated.`,
            })
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
          toast.success(apiMessage, {
            description: `${targetName} no longer holds that role.`,
          })
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
          toast.success(apiMessage, {
            description: `${targetName}'s extra permissions have been updated.`,
          })
        }
      />
    </div>
  );
}
