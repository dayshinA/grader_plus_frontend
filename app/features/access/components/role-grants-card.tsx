import { useState } from "react";
import { Plus, ShieldOff } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
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
import { ScopePicker } from "~/features/access/components/scope-picker";
import {
  ROLE_LABELS,
  ROLES,
  SCOPE_FOR_ROLE,
  type Role,
  type RoleAssignment,
} from "~/features/access/types";
import { usePermission } from "~/features/auth/api/auth-context";
import { formatDateTime } from "~/utils/format";
import { isApiError } from "~/lib/api-client";

const ROLE_OPTIONS = ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }));

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
  const [role, setRole] = useState<Role>("marker");
  const [scopeId, setScopeId] = useState("");

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
            options={ROLE_OPTIONS}
            error={isApiError(error) ? error.fieldError("role") : undefined}
          />

          <ScopePicker
            role={role}
            scopeId={scopeId}
            onScopeIdChange={setScopeId}
            error={isApiError(error) ? error.fieldError("scopeId") : undefined}
          />

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

function GrantRow({
  grant,
  canRevoke,
  onRevoke,
}: {
  grant: RoleAssignment;
  canRevoke: boolean;
  onRevoke: (grant: RoleAssignment) => void;
}) {
  const revoked = grant.revokedAt !== null;

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{ROLE_LABELS[grant.role]}</p>
          {revoked && <Badge variant="outline">Revoked</Badge>}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {grant.scopeType === "system"
            ? "Across the whole platform"
            : grant.scopeType === "academic_unit"
              ? `Academic unit ${grant.scopeId?.slice(0, 8)}`
              : `Offering ${grant.scopeId?.slice(0, 8)}`}
          {" · granted "}
          {formatDateTime(grant.grantedAt)}
          {revoked && ` · revoked ${formatDateTime(grant.revokedAt)}`}
        </p>
      </div>

      {canRevoke && !revoked && (
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
 * The grants on one account, live and revoked alike. A revoked grant stays in the list
 * because the record of who held what is the point of the table, and there is no delete.
 */
export function RoleGrantsCard({ userId, userName }: { userId: string; userName: string }) {
  const canGrant = usePermission("role.grant");
  const canRevoke = usePermission("role.revoke");
  const { data, isPending, isError, error, refetch, isFetching } = useUserRoles(userId);
  const revoke = useRevokeRole(userId);

  const [grantOpen, setGrantOpen] = useState(false);
  const [revoking, setRevoking] = useState<RoleAssignment | undefined>();

  const grants = data ?? [];
  const active = grants.filter((grant) => grant.revokedAt === null);
  const history = grants.filter((grant) => grant.revokedAt !== null);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-base">Roles</CardTitle>
          <CardDescription>
            A grant is a role and a scope. Revoking takes effect on the next request, not the
            next sign in.
          </CardDescription>
        </div>
        {canGrant && (
          <Button
            size="sm"
            className="h-9 shrink-0 cursor-pointer"
            onClick={() => setGrantOpen(true)}
          >
            <Plus className="size-4" aria-hidden="true" />
            Grant
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
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
          <>
            {active.length > 0 && (
              <ul className="space-y-2">
                {active.map((grant) => (
                  <GrantRow
                    key={grant.id}
                    grant={grant}
                    canRevoke={canRevoke}
                    onRevoke={setRevoking}
                  />
                ))}
              </ul>
            )}

            {history.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Previously held</p>
                <ul className="space-y-2 opacity-70">
                  {history.map((grant) => (
                    <GrantRow
                      key={grant.id}
                      grant={grant}
                      canRevoke={false}
                      onRevoke={setRevoking}
                    />
                  ))}
                </ul>
              </div>
            )}
          </>
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
        title="Revoke this role?"
        description={
          revoking
            ? `${userName} loses ${ROLE_LABELS[revoking.role]} on that scope from their next request onward. The grant stays in the list as history rather than being deleted.`
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
