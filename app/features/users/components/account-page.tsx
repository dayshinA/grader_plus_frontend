import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { DetailList } from "~/components/ui/detail-list";
import { FormError } from "~/components/ui/form-error";
import { FormField } from "~/components/ui/form-field";
import { PageHeader } from "~/components/ui/page-header";
import { SubmitButton } from "~/components/ui/submit-button";
import { ROLE_LABELS } from "~/features/access/types";
import { useAuth } from "~/features/auth/api/auth-context";
import { usersService } from "~/features/users/api/users.service";
import { formatDateTime } from "~/utils/format";
import { isApiError } from "~/lib/api-client";

/**
 * Your own record and the roles you hold. The roles list is read only here: granting is
 * somebody else's screen, and this one exists so a person can see why they can see what
 * they can see.
 */
export function AccountPage() {
  const { user, grants } = useAuth();
  const queryClient = useQueryClient();
  // ProtectedRoute waits on GET /me, so the record is in hand on the first render here.
  const [fullName, setFullName] = useState(user?.fullName ?? "");

  const updateMe = useMutation({
    mutationFn: (name: string) => usersService.updateMe({ fullName: name }),
    onSuccess: ({ message }) => {
      toast.success(message || "Profile updated.");
      void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });

  const error = updateMe.error;
  const nameChanged = fullName.trim().length > 0 && fullName.trim() !== user?.fullName;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account"
        description="Your name, your password and the roles you currently hold."
        actions={
          <Button asChild variant="outline" className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto">
            <Link to="/account/password">
              <KeyRound className="size-4" aria-hidden="true" />
              Change password
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your details</CardTitle>
          <CardDescription>
            Your email address is changed by an administrator, not here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              updateMe.mutate(fullName.trim());
            }}
            className="space-y-4"
            noValidate
          >
            <FormError error={error} />

            <FormField
              label="Full name"
              name="fullName"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              error={isApiError(error) ? error.fieldError("fullName") : undefined}
            />

            <DetailList
              items={[
                { label: "Email", value: user?.email ?? "Not set" },
                {
                  label: "Last signed in",
                  value: user?.lastLoginAt ? formatDateTime(user.lastLoginAt) : "First session",
                },
                {
                  label: "Account status",
                  value: user?.isActive ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Badge variant="destructive">Deactivated</Badge>
                  ),
                },
              ]}
            />

            <SubmitButton
              isPending={updateMe.isPending}
              pendingLabel="Saving"
              disabled={!nameChanged}
              className="sm:w-auto"
            >
              Save name
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roles you hold</CardTitle>
          <CardDescription>
            What you can do is the union of every grant below. Holding several at once is
            normal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {grants.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No roles have been granted to this account yet, so nothing is open to you. Ask
              whoever created it.
            </p>
          ) : (
            <ul className="space-y-3">
              {grants.map((grant, index) => (
                <li
                  key={`${grant.role}-${grant.scopeId ?? "system"}-${index}`}
                  className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{ROLE_LABELS[grant.role]}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {grant.scopeType === "system"
                        ? "Across the whole platform"
                        : grant.scopeType === "academic_unit"
                          ? "Scoped to an academic unit"
                          : "Scoped to one module offering"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="w-fit">
                    {grant.permissions.length} permissions
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
