import { ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { toast } from "sonner";

import { BackLink } from "~/components/ui/back-link";
import { Badge } from "~/components/ui/badge";
import { Callout } from "~/components/ui/callout";
import { Card, CardContent } from "~/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { ErrorCard } from "~/components/ui/error-card";
import { PageHeader } from "~/components/ui/page-header";
import { Skeleton } from "~/components/ui/skeleton";
import { useAuth } from "~/features/auth/api/auth-context";
import { usePermissionCatalogue } from "~/features/permissions/api/use-permission-catalogue";
import type {
  PermissionCatalogEntry,
  PermissionKey,
  UserRoleAssignmentDetail,
} from "~/features/permissions/types";
import { useDelegationCandidates } from "~/features/role-assignments/api/use-delegation-candidates";
import { useGrantExtraPermission } from "~/features/role-assignments/api/use-grant-extra-permission";
import { useRevokeExtraPermission } from "~/features/role-assignments/api/use-revoke-extra-permission";
import { useScopeOptions } from "~/features/role-assignments/api/use-scope-options";
import { useUserRoleAssignments } from "~/features/role-assignments/api/use-user-role-assignments";
import { ExtrasFieldset } from "~/features/role-assignments/components/extras-fieldset";
import {
  canRevokeAssignment,
  grantableExtras,
  permissionKeysAtScope,
  permissionTitle,
  resolveScopeChain,
  roleAssignmentErrorMessage,
  scopeLabelFor,
  SCOPE_TYPE_LABELS,
} from "~/features/role-assignments/utils";

/**
 * Add or withdraw the additive extras on one existing assignment — a full page
 * (`/super-admin/role-assignments/:assignmentId/extras`) rather than the modal it was until
 * 2026-08-10, for the same reasons `UserFormDialog` became `UserFormPage` on 2026-08-04: the list
 * is as long as the grantor's own permission set, a modal caps its height, and a page is linkable
 * and survives a refresh.
 *
 * **Applies each change immediately** — one request per checkbox, no Save button (confirmed with
 * Dayshin, 2026-08-10). That is the model the dialog already had per Add/Withdraw click; only the
 * control changed. So there is no unsaved state to lose on navigate-away, and no half-applied save
 * to reason about. Every checkbox reads its checked state from `GET /role-assignments`, never from
 * local state, which is why the mutation hooks return their invalidation promise: the row stays in
 * its "Saving…" state until the refreshed list lands.
 *
 * ⚠️ Withdrawing is addressed by the permission's **UUID**, not its key: the route uses a
 * `ParseUUIDPipe`, while the assignment detail carries keys only. The id comes from the catalogue
 * (`GET /permissions`), which is why a held extra the catalogue can't resolve renders disabled —
 * firing a request with a key in the id position would 400 on the pipe.
 *
 * Extras are purely additive. A template's own defaults can never be subtracted, so they're shown
 * here as fixed context, not as removable rows.
 *
 * Needs `?userId=`: there is no `GET /role-assignments/:id`, so the assignment is found by id in
 * the user's list — the same "find it in the already-loaded list" convention as
 * `users.$userId.tsx`, and the same `?userId=` the delegation screen itself uses (decision #41).
 */
export function ManageExtrasPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("userId");

  const { permissions: summary } = useAuth();
  const { data: catalogue, isLoading: catalogueLoading } = usePermissionCatalogue();
  const { optionsByScopeType, sources } = useScopeOptions();
  const { candidates } = useDelegationCandidates();
  const {
    data: assignments,
    isLoading: assignmentsLoading,
    isError,
    error: loadError,
    refetch,
    isFetching,
  } = useUserRoleAssignments(userId ?? undefined);

  // Which keys have a write in flight, and which one last failed. Local rather than read off the
  // mutations: several rows can be toggled at once, and `mutation.isPending`/`.error` describe only
  // the most recent call, so they'd light up the wrong row.
  const [inFlight, setInFlight] = useState<PermissionKey[]>([]);
  const [failure, setFailure] = useState<{ key: PermissionKey; error: unknown } | null>(null);

  const grantExtra = useGrantExtraPermission();
  const revokeExtra = useRevokeExtraPermission();

  const assignment = assignments?.find((candidate) => candidate.id === assignmentId) ?? null;

  // A deep link can name someone the current grantor can't enumerate (see the delegation screen's
  // own note) — the assignments call only needs `roles.view`, so the screen stays usable without a
  // name to show.
  const targetName =
    candidates.find((candidate) => candidate.id === userId)?.fullName ?? "This user";

  const chain = useMemo(
    () =>
      assignment ? resolveScopeChain(assignment.scopeType, assignment.scopeId, sources) : {},
    [assignment, sources],
  );

  // Rule 1 — only keys the grantor holds at a containing scope, minus anything the assignment
  // already has (as a default or an existing extra), so nothing offered here is a no-op.
  const addable = useMemo(
    () =>
      grantableExtras(
        catalogue,
        permissionKeysAtScope(summary, chain),
        assignment?.permissionKeys ?? [],
      ),
    [catalogue, summary, chain, assignment],
  );

  const current = useMemo(() => assignment?.extraPermissionKeys ?? [], [assignment]);

  const catalogueByKey = useMemo(
    () => new Map((catalogue ?? []).map((entry) => [entry.key, entry])),
    [catalogue],
  );

  // The rows: everything already granted as an extra (so it can be unticked) plus everything Rule 1
  // allows adding. A held extra missing from the catalogue still gets a row — dropping it would
  // silently hide a permission the user actually has — but it can't be withdrawn without its UUID,
  // so it renders disabled.
  const rows = useMemo<PermissionCatalogEntry[]>(
    () => [
      ...current.map(
        (key) =>
          catalogueByKey.get(key) ?? { id: key, key, description: "", category: "functional" as const },
      ),
      ...addable,
    ],
    [current, catalogueByKey, addable],
  );

  const unresolvable = useMemo(
    () => current.filter((key) => !catalogueByKey.has(key)),
    [current, catalogueByKey],
  );

  const defaults = useMemo(
    () => (assignment?.permissionKeys ?? []).filter((key) => !current.includes(key)),
    [assignment, current],
  );

  function handleToggle(key: PermissionKey) {
    if (!assignment || !userId || inFlight.includes(key)) return;

    setFailure(null);
    setInFlight((keys) => [...keys, key]);
    const settle = () => setInFlight((keys) => keys.filter((existing) => existing !== key));
    const onError = (error: unknown) => setFailure({ key, error });

    if (current.includes(key)) {
      const permissionId = catalogueByKey.get(key)?.id;
      if (!permissionId) {
        settle();
        return;
      }
      revokeExtra.mutate(
        { assignmentId: assignment.id, permissionId, userId },
        {
          onSuccess: ({ message }) =>
            toast.success(message, {
              description: `${targetName} no longer has "${permissionTitle(key)}" on top of this role.`,
            }),
          onError,
          onSettled: settle,
        },
      );
      return;
    }

    grantExtra.mutate(
      { assignmentId: assignment.id, permissionKey: key, userId },
      {
        onSuccess: ({ message }) =>
          toast.success(message, {
            description: `${targetName} now has "${permissionTitle(key)}" on top of this role.`,
          }),
        onError,
        onSettled: settle,
      },
    );
  }

  const backFallback = {
    to: userId
      ? `/super-admin/role-assignments?userId=${encodeURIComponent(userId)}`
      : "/super-admin/role-assignments",
    label: "Role assignments",
  };

  function shell(children: React.ReactNode, description?: string) {
    return (
      <div className="space-y-6">
        <BackLink fallback={backFallback} />
        <PageHeader title="Extra permissions" description={description} />
        {children}
      </div>
    );
  }

  // A link built by hand, or one that lost its query string. Nothing can be loaded without it.
  if (!userId) {
    return shell(
      <ErrorCard
        title="Couldn't open this role"
        description="This link is missing the user it belongs to. Open the role from the Role Assignments screen instead."
      />,
    );
  }

  if (isError) {
    return shell(
      <ErrorCard
        title="Couldn't load this user's roles"
        error={loadError}
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />,
    );
  }

  if (assignmentsLoading || catalogueLoading) {
    return shell(
      <>
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </>,
    );
  }

  // The list is active-only, so a revoked assignment simply vanishes from it — most likely someone
  // else revoked the role while this page was open.
  if (!assignment) {
    return shell(
      <ErrorCard
        title="Role assignment not found"
        description="This role no longer exists, or it isn't one your account can see. It may have been revoked."
      />,
    );
  }

  const scopeLabel = scopeLabelFor(assignment, optionsByScopeType);
  const description = `On top of ${targetName}'s ${assignment.roleTemplateName} role at ${scopeLabel}.`;

  // Rule 2 governs extras as well as revocation. The row menu hides the link when this is false,
  // but a pasted URL doesn't go through the row menu.
  if (!canRevokeAssignment(summary, assignment, sources)) {
    return shell(
      <Card>
        <CardContent className="py-4">
          <Empty className="px-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShieldCheck aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>You don't outrank this role</EmptyTitle>
              <EmptyDescription>
                Permissions can only be changed on a role more junior than your own at this level.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>,
      description,
    );
  }

  return shell(
    <div className="space-y-6">
      {failure && (
        <Callout variant="error" title="Couldn't change the extra permissions">
          {permissionTitle(failure.key)}: {roleAssignmentErrorMessage(failure.error)}
        </Callout>
      )}

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-4">
            <Empty className="px-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShieldCheck aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Nothing to add</EmptyTitle>
                <EmptyDescription>
                  This role already covers everything you hold yourself at this level, so there's no
                  permission left for you to grant on top of it.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <ExtrasFieldset
          availableExtras={rows}
          selected={current}
          onToggle={handleToggle}
          pendingKeys={inFlight}
          disabledKeys={unresolvable}
          legend="Permissions on top of this role"
          description="Ticking or unticking one saves it straight away. Only permissions you hold yourself at this level are listed."
        />
      )}

      <DefaultsSection assignment={assignment} defaults={defaults} />
    </div>,
    description,
  );
}

/** The role template's own permissions — context, not controls: they can't be subtracted. */
function DefaultsSection({
  assignment,
  defaults,
}: {
  assignment: UserRoleAssignmentDetail;
  defaults: PermissionKey[];
}) {
  if (defaults.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <p className="px-1 text-sm font-medium">From the {assignment.roleTemplateName} role itself</p>
      <p className="px-1 text-xs text-muted-foreground">
        These come with the role{" "}
        {assignment.scopeType === "global"
          ? "everywhere"
          : `at ${SCOPE_TYPE_LABELS[assignment.scopeType].toLowerCase()} level`}{" "}
        and can't be removed individually. Revoke the whole role to take them away.
      </p>
      <div className="flex flex-wrap gap-1 px-1">
        {defaults.map((key) => (
          <Badge key={key} variant="secondary">
            {permissionTitle(key)}
          </Badge>
        ))}
      </div>
    </div>
  );
}
