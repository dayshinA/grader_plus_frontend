import { useMemo, useState } from "react";
import { UserMinus } from "lucide-react";
import { toast } from "sonner";

import { BackLink } from "~/components/ui/back-link";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { DetailList } from "~/components/ui/detail-list";
import { ErrorCard } from "~/components/ui/error-card";
import { FormError } from "~/components/ui/form-error";
import { FormField } from "~/components/ui/form-field";
import { NotFoundPage } from "~/components/ui/not-found-page";
import { PageHeader } from "~/components/ui/page-header";
import { Skeleton } from "~/components/ui/skeleton";
import { SubmitButton } from "~/components/ui/submit-button";
import { RoleGrantsCard } from "~/features/access/components/role-grants-card";
import { usePermission } from "~/features/auth/api/auth-context";
import { useDeactivateUser, useUpdateUser, useUser } from "~/features/users/api/use-users";
import { useDeclaredBackTarget, type BackTarget } from "~/hooks/use-back-link";
import { formatDateTime } from "~/utils/format";
import { isApiError, isNotFound } from "~/lib/api-client";

/**
 * Only the 404 uses this. That screen is a dead end and needs one door out whatever route
 * brought somebody to it, and the accounts list is where an account that did exist would be.
 */
const EXIT: BackTarget = { to: "/admin/users", label: "accounts" };

/** Editing one account, and the grants on it. There is no delete: the API deactivates. */
export function UserDetailPage({ userId }: { userId: string }) {
  const declaredBack = useDeclaredBackTarget();
  const back = declaredBack ?? EXIT;
  const canUpdate = usePermission("user.update");
  const canDeactivate = usePermission("user.deactivate");

  const { data: user, isPending, isError, error, refetch, isFetching } = useUser(userId);
  const update = useUpdateUser();
  const deactivate = useDeactivateUser();

  // The grants on this account arrive named, the rows behind the Roles card do not, so the
  // card is given the lookup rather than a second request.
  const scopeNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const grant of user?.roles ?? []) {
      if (grant.scopeId && grant.scopeName) names.set(grant.scopeId, grant.scopeName);
    }
    return names;
  }, [user]);

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  if (isNotFound(error)) {
    return (
      <NotFoundPage
        homeHref={back.to}
        backLabel={declaredBack ? `Back to ${back.label}` : `Go to ${back.label}`}
        title="No such account"
        description="That account does not exist"
        helperText="A refusal would read differently. This one is absent for everybody, not hidden from you."
      />
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <BackLink />
        <ErrorCard
          title="Could not load this account"
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      </div>
    );
  }

  if (isPending || !user) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }

  function startEditing() {
    if (!user) return;
    setFullName(user.fullName);
    setEmail(user.email);
    setEditing(true);
  }

  return (
    <div className="space-y-6">
      <BackLink />

      <PageHeader
        title={user.fullName}
        description={user.email}
        actions={
          canDeactivate &&
          user.isActive && (
            <Button
              variant="outline"
              className="h-11 w-full cursor-pointer text-destructive hover:text-destructive sm:h-9 sm:w-auto"
              onClick={() => setConfirmDeactivate(true)}
            >
              <UserMinus className="size-4" aria-hidden="true" />
              Deactivate
            </Button>
          )
        }
      />

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription>
              Deactivation bites within one access token lifetime, at most fifteen minutes.
            </CardDescription>
          </div>
          {canUpdate && !editing && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 shrink-0 cursor-pointer"
              onClick={startEditing}
            >
              Edit
            </Button>
          )}
        </CardHeader>

        <CardContent>
          {editing ? (
            <form
              className="space-y-4"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                update.mutate(
                  {
                    id: user.id,
                    payload: { fullName: fullName.trim(), email: email.trim() },
                  },
                  {
                    onSuccess: ({ message }) => {
                      toast.success(message || "Account updated.");
                      setEditing(false);
                    },
                  },
                );
              }}
            >
              <FormError error={update.error} />

              <FormField
                label="Full name"
                name="fullName"
                required
                autoFocus
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                error={isApiError(update.error) ? update.error.fieldError("fullName") : undefined}
              />

              <FormField
                label="Email address"
                name="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={isApiError(update.error) ? update.error.fieldError("email") : undefined}
              />

              <div className="flex flex-col gap-2 sm:flex-row">
                <SubmitButton
                  isPending={update.isPending}
                  pendingLabel="Saving"
                  className="sm:w-auto"
                  disabled={fullName.trim().length < 2 || email.trim().length === 0}
                >
                  Save changes
                </SubmitButton>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 cursor-pointer sm:h-9"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <DetailList
              items={[
                { label: "Full name", value: user.fullName },
                { label: "Email", value: user.email },
                {
                  label: "Status",
                  value: user.isActive ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Badge variant="outline">Deactivated</Badge>
                  ),
                },
                {
                  label: "Password",
                  value: user.mustChangePassword ? (
                    <Badge variant="warning">Must change on next sign in</Badge>
                  ) : (
                    "Set by the holder"
                  ),
                },
                {
                  label: "Last signed in",
                  value: user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never",
                },
                { label: "Created", value: formatDateTime(user.createdAt) },
              ]}
            />
          )}
        </CardContent>
      </Card>

      <RoleGrantsCard userId={user.id} userName={user.fullName} scopeNames={scopeNames} />

      <ConfirmDialog
        open={confirmDeactivate}
        onOpenChange={setConfirmDeactivate}
        title="Deactivate this account?"
        description={`${user.fullName} can no longer sign in, and an existing session dies within fifteen minutes. Nothing they have marked is removed, and the account stays readable. Deactivation is refused if they are the only coordinator on an open offering.`}
        confirmLabel="Deactivate"
        pendingLabel="Deactivating"
        destructive
        isPending={deactivate.isPending}
        onConfirm={() =>
          deactivate.mutate(user.id, {
            onSuccess: ({ message }) => {
              toast.success(message || "Account deactivated.");
              setConfirmDeactivate(false);
            },
          })
        }
      />
    </div>
  );
}
