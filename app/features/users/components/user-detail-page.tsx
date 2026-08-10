import { Ban, CheckCircle2, Pencil, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { BackLink } from "~/components/ui/back-link";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { DetailList } from "~/components/ui/detail-list";
import { ErrorCard } from "~/components/ui/error-card";
import { PageHeader } from "~/components/ui/page-header";
import { Skeleton } from "~/components/ui/skeleton";
import type { PermissionKey, UserRoleAssignmentDetail } from "~/features/permissions/types";
import { usePermissionCatalogue } from "~/features/permissions/api/use-permission-catalogue";
import { useScopeOptions } from "~/features/role-assignments/api/use-scope-options";
import { useUserRoleAssignments } from "~/features/role-assignments/api/use-user-role-assignments";
import { DeactivateUserDialog } from "~/features/users/components/deactivate-user-dialog";
import {
  groupPermissionsByDomain,
  permissionDescription,
  permissionTitle,
  SCOPE_TYPE_LABELS,
} from "~/features/role-assignments/utils";
import type { UserResponse } from "~/features/users/types";
import { is403 } from "~/lib/api-client";

export interface UserDetailPageProps {
  user: UserResponse;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Read-only "who is this and what can they do" view — reached from a Users-table row
 * (`/super-admin/users/:userId`), separate from the edit page. Two data sources, both
 * already built for the delegation screen and reused rather than duplicated:
 * `useUserRoleAssignments` (needs `roles.view`, same as `/super-admin/role-assignments`) for the
 * roles held, and `groupPermissionsByDomain`/`permissionTitle`/`permissionDescription` (built for
 * `RoleTemplatePicker`'s defaults preview) for a friendly, deduplicated "everything this account
 * can do" list — the one thing neither the Users table nor the per-role Role Assignments table
 * shows in one place today.
 *
 * Every account that can reach this page (holds `users.view`) also holds `roles.view` at the
 * same scope — confirmed against `backend_verified_RBAC.txt` §8.1–8.4, every role template that
 * grants one grants the other — so the roles/permissions section isn't expected to 403 in
 * practice. Handled gracefully anyway (`is403`-as-empty-state, decision #44) rather than assumed.
 */
export function UserDetailPage({ user }: UserDetailPageProps) {
  const [deactivateTarget, setDeactivateTarget] = useState<UserResponse | null>(null);

  const {
    data: assignments,
    isLoading: assignmentsLoading,
    isError: assignmentsIsError,
    error: assignmentsError,
    refetch: refetchAssignments,
    isFetching: assignmentsFetching,
  } = useUserRoleAssignments(user.id);
  const { data: catalogue } = usePermissionCatalogue();
  const { optionsByScopeType } = useScopeOptions();

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

  // The deduplicated union of every active assignment's resolved permissions — mirrors
  // `/role-assignments/me`'s own `permissionKeys` shape (SCOPE-BLIND, deliberately: this is "what
  // can this account do anywhere", not a per-scope breakdown, which the per-assignment cards
  // above it already cover).
  //
  // Split into "default" (comes from a role template's own scope defaults on at least one
  // assignment) vs. "extra" (only ever appears via `extraPermissionKeys`, i.e. individually
  // granted on top of a role — Rule 1, see `role-assignments/utils.ts`) — surfaced here because a
  // merged, undifferentiated list reads as "this is what the role gets," which is wrong for an
  // extra: e.g. a School Admin's own template never grants `rubrics.view`
  // (`permission-catalog.definition.ts`'s own comment: "Deliberately holds NO rubrics.* at all"),
  // but a System Administrator granting it as an extra on a specific account is legitimate under
  // Rule 1 (System Administrator holds it itself) and should read as "extra," not "default."
  // A key that's a default on *any* assignment counts as a default overall, even if it also
  // happens to be an extra on a different one.
  const { allPermissions, extraKeys } = useMemo(() => {
    const defaults = new Set<PermissionKey>();
    const extras = new Set<PermissionKey>();
    for (const assignment of assignments ?? []) {
      const assignmentExtras = new Set(assignment.extraPermissionKeys);
      for (const key of assignment.permissionKeys) {
        (assignmentExtras.has(key) ? extras : defaults).add(key);
      }
    }
    for (const key of defaults) extras.delete(key);
    return {
      allPermissions: groupPermissionsByDomain([...defaults, ...extras], (key) => key),
      extraKeys: extras,
    };
  }, [assignments]);

  const rolesForbidden = assignmentsIsError && is403(assignmentsError);

  return (
    <div className="space-y-6">
      <BackLink fallback={{ to: "/super-admin/users", label: "Users" }} />

      <PageHeader
        title={user.fullName}
        description={user.email}
        actions={
          <>
            <Button
              variant="outline"
              className="h-11 cursor-pointer sm:h-9"
              onClick={() => setDeactivateTarget(user)}
            >
              {user.isActive ? (
                <>
                  <Ban aria-hidden="true" />
                  Deactivate
                </>
              ) : (
                <>
                  <CheckCircle2 aria-hidden="true" />
                  Reactivate
                </>
              )}
            </Button>
            <Button asChild className="h-11 cursor-pointer sm:h-9">
              <Link to={`/super-admin/users/${user.id}/edit`}>
                <Pencil aria-hidden="true" />
                Edit
              </Link>
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList
            items={[
              { label: "Email", value: user.email },
              { label: "Learn ID", value: user.learnId ?? "—" },
              { label: "Account created", value: formatDate(user.createdAt) },
              {
                label: "Status",
                value: (
                  <Badge variant={user.isActive ? "success" : "outline"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roles held</CardTitle>
          <Button variant="outline" size="sm" asChild className="cursor-pointer">
            <Link to={`/super-admin/role-assignments?userId=${user.id}`}>
              <ShieldCheck aria-hidden="true" />
              Manage roles
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {rolesForbidden ? (
            <Callout title="Roles aren't visible to your account">
              Your account can't see this user's roles or permissions. This page only shows
              details it can already read.
            </Callout>
          ) : assignmentsIsError ? (
            <ErrorCard
              title="Couldn't load this user's roles"
              error={assignmentsError}
              onRetry={() => void refetchAssignments()}
              isRetrying={assignmentsFetching}
            />
          ) : assignmentsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : assignments && assignments.length > 0 ? (
            <div className="space-y-2">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex flex-col gap-2 rounded-xl border border-border p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {assignment.roleTemplateName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {scopeLabelFor(assignment)}
                      {assignment.scopeType !== "global" &&
                        ` · ${SCOPE_TYPE_LABELS[assignment.scopeType]}`}
                    </p>
                    {assignment.extraPermissionKeys.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Extra permissions
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {assignment.extraPermissionKeys.map((key) => (
                            <Badge key={key} variant="outline">
                              {permissionTitle(key)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    Granted {formatDate(assignment.grantedAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              {user.fullName} holds no roles yet.
            </p>
          )}
        </CardContent>
      </Card>

      {!rolesForbidden && !assignmentsIsError && assignments && assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              All permissions (
              {allPermissions.reduce((sum, group) => sum + group.items.length, 0)})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Everything this account can do, anywhere it holds a role.
              {extraKeys.size > 0 && (
                <>
                  {" "}
                  Permissions tagged <Badge variant="outline">Extra</Badge> were granted
                  individually on top of a role, not as part of the role's own defaults.
                </>
              )}
            </p>
            <div className="grid gap-6 sm:grid-cols-2">
              {allPermissions.map((group) => (
                <div key={group.label} className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{group.label}</p>
                  <div className="space-y-2">
                    {group.items.map((key) => (
                      <div key={key}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-foreground">{permissionTitle(key)}</span>
                          {extraKeys.has(key) && <Badge variant="outline">Extra</Badge>}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {permissionDescription(key, catalogue)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <DeactivateUserDialog
        user={deactivateTarget}
        open={deactivateTarget !== null}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        onSuccess={(action, targetUser, apiMessage) => {
          setDeactivateTarget(null);
          toast.success(apiMessage, {
            description:
              action === "deactivated"
                ? `${targetUser.fullName} can no longer sign in.`
                : `${targetUser.fullName} can sign in again.`,
          });
        }}
      />
    </div>
  );
}
