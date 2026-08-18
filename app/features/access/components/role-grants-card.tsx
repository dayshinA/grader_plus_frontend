import { useState } from "react";
import { Plus, ShieldOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ErrorCard } from "~/components/ui/error-card";
import { FormError } from "~/components/ui/form-error";
import { SelectField } from "~/components/ui/select-field";
import { Skeleton } from "~/components/ui/skeleton";
import { SubmitButton } from "~/components/ui/submit-button";
import { useGrantRole, useRevokeRole, useUserRoles } from "~/features/access/api/use-access";
import { grantableRoles } from "~/features/access/permissions";
import { ScopePicker } from "~/features/access/components/scope-picker";
import {
  ROLE_LABELS,
  SCOPE_FOR_ROLE,
  type Role,
  type RoleAssignment,
} from "~/features/access/types";
import { useAuth, usePermission } from "~/features/auth/api/auth-context";
import { formatDateTime } from "~/utils/format";
import { isApiError } from "~/lib/api-client";

function GrantRoleDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}) {
  const grant = useGrantRole(userId);
  const { grants } = useAuth();
  const [role, setRole] = useState<Role>("marker");
  const [scopeId, setScopeId] = useState("");

  // Nobody grants a role at or above their own, so the ones this caller would be refused
  // for are absent rather than offered and rejected on submit.
  const roleOptions = grantableRoles(grants).map((option) => ({
    value: option,
    label: ROLE_LABELS[option],
  }));

  const scopeType = SCOPE_FOR_ROLE[role];
  const needsScope = scopeType !== "system";
  const canSubmit = !needsScope || scopeId.length > 0;

  const error = grant.error;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    grant.mutate(
      { role, scopeType, scopeId: needsScope ? scopeId : undefined },
      {
        onSuccess: ({ message }) => {
          toast.success(message || "Role granted.");
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Grant a role to {userName}</DialogTitle>
          <DialogDescription>
            What somebody can do is the union of every grant they hold, so adding one never
            takes anything away.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <FormError error={error} />

          <SelectField
            label="Role"
            value={role}
            onValueChange={(value) => {
              setRole(value as Role);
              setScopeId("");
            }}
            options={roleOptions}
            error={isApiError(error) ? error.fieldError("role") : undefined}
          />

          <ScopePicker
            role={role}
            scopeId={scopeId}
            onScopeIdChange={setScopeId}
            error={isApiError(error) ? error.fieldError("scopeId") : undefined}
          />

          <p className="text-xs text-muted-foreground">
            You can grant a role below your own, on a scope you hold. Your own level and
            anything above it is not on this list, and nobody grants themselves a role.
          </p>

          {role === "coordinator" && (
            <Callout variant="info">
              A coordinator cannot mark on their own offering. If this person also needs to
              mark it, that is refused, and the work goes to somebody else.
            </Callout>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 cursor-pointer sm:h-9"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <SubmitButton
              isPending={grant.isPending}
              pendingLabel="Granting"
              disabled={!canSubmit}
              className="sm:w-auto"
            >
              Grant role
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * `GET /users/:id/roles` names no scopes, so the name comes from the `roles` on the user
 * the detail screen already holds. A truncated id is the fallback for a grant that lookup
 * does not cover, which is better than nothing but is not meant to be read.
 */
function scopeLabel(grant: RoleAssignment, scopeNames: Map<string, string>): string {
  if (grant.scopeType === "system") return "Across the whole platform";
  if (grant.scopeId && scopeNames.has(grant.scopeId)) {
    return scopeNames.get(grant.scopeId) as string;
  }
  const kind = grant.scopeType === "academic_unit" ? "Academic unit" : "Offering";
  return `${kind} ${grant.scopeId?.slice(0, 8)}`;
}

function GrantRow({
  grant,
  scopeNames,
  canRevoke,
  onRevoke,
}: {
  grant: RoleAssignment;
  scopeNames: Map<string, string>;
  canRevoke: boolean;
  onRevoke: (grant: RoleAssignment) => void;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium">{ROLE_LABELS[grant.role]}</p>
        <p className="truncate text-xs text-muted-foreground">
          {scopeLabel(grant, scopeNames)}
          {" · granted "}
          {formatDateTime(grant.grantedAt)}
        </p>
      </div>

      {canRevoke && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-fit cursor-pointer text-destructive hover:text-destructive"
          onClick={() => onRevoke(grant)}
        >
          <ShieldOff className="size-4" aria-hidden="true" />
          Revoke
        </Button>
      )}
    </li>
  );
}

/**
 * The grants on one account. Active ones only: revoking sets `revoked_at` rather than
 * deleting the row, but no route hands a revoked grant back, so there is no history to
 * show here.
 *
 * The list is also narrowed to the scopes the caller reaches, which is why this card can
 * be shorter than the one a system administrator sees on the same person.
 */
export function RoleGrantsCard({
  userId,
  userName,
  userIsActive,
  scopeNames,
}: {
  userId: string;
  userName: string;
  /** A grant to a deactivated account is refused with 409, so the dialog is not offered. */
  userIsActive: boolean;
  /** scopeId to name, from the `roles` on the user. These rows carry no name of their own. */
  scopeNames: Map<string, string>;
}) {
  const canGrant = usePermission("role.grant");
  const canRevoke = usePermission("role.revoke");
  const { data, isPending, isError, error, refetch, isFetching } = useUserRoles(userId);
  const revoke = useRevokeRole(userId);

  const [grantOpen, setGrantOpen] = useState(false);
  const [revoking, setRevoking] = useState<RoleAssignment | undefined>();

  const grants = data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <CardTitle asChild className="text-base">
            <h2>Roles</h2>
          </CardTitle>
          <CardDescription>
            A grant is a role and a scope. Revoking takes effect on the next request, not the
            next sign in, and takes the grant off this list.
          </CardDescription>
        </div>
        {canGrant && userIsActive && (
          <Button
            size="sm"
            className="h-11 w-full shrink-0 cursor-pointer sm:h-9 sm:w-auto"
            onClick={() => setGrantOpen(true)}
          >
            <Plus className="size-4" aria-hidden="true" />
            Grant
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {canGrant && !userIsActive && (
          <Callout variant="info">
            This account is deactivated, so granting it a new role is refused. The roles it
            already held stay listed for the record.
          </Callout>
        )}
        {isError ? (
          <ErrorCard
            title="Could not load roles"
            error={error}
            onRetry={() => void refetch()}
            isRetrying={isFetching}
          />
        ) : isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        ) : grants.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This account holds no roles, so nothing in GraderPlus is open to it yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {grants.map((grant) => (
              <GrantRow
                key={grant.id}
                grant={grant}
                scopeNames={scopeNames}
                canRevoke={canRevoke}
                onRevoke={setRevoking}
              />
            ))}
          </ul>
        )}
      </CardContent>

      {grantOpen && (
        <GrantRoleDialog
          open={grantOpen}
          onOpenChange={setGrantOpen}
          userId={userId}
          userName={userName}
        />
      )}

      <ConfirmDialog
        open={Boolean(revoking)}
        onOpenChange={(open) => !open && setRevoking(undefined)}
        title={revoking ? `Revoke ${ROLE_LABELS[revoking.role]}?` : "Revoke this role?"}
        description={
          revoking
            ? `${userName} loses ${ROLE_LABELS[revoking.role]} there straight away. Nothing they have already marked is touched.`
            : ""
        }
        confirmLabel="Revoke"
        pendingLabel="Revoking"
        destructive
        isPending={revoke.isPending}
        onConfirm={() => {
          if (!revoking) return;
          revoke.mutate(revoking.id, {
            onSuccess: ({ message }) => {
              toast.success(message || "Role revoked.");
              setRevoking(undefined);
            },
          });
        }}
      />
    </Card>
  );
}
