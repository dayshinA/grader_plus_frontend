import { useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { FormError } from "~/components/ui/form-error";
import { FormField } from "~/components/ui/form-field";
import { SecretField } from "~/components/ui/secret-field";
import { SelectField } from "~/components/ui/select-field";
import { SubmitButton } from "~/components/ui/submit-button";
import { ScopePicker } from "~/features/access/components/scope-picker";
import { grantableRoles } from "~/features/access/permissions";
import { ROLE_LABELS, SCOPE_FOR_ROLE, type Role } from "~/features/access/types";
import { useAuth } from "~/features/auth/api/auth-context";
import { useCreateUser } from "~/features/users/api/use-users";
import type { CreatedUser } from "~/features/users/types";
import { isApiError } from "~/lib/api-client";

/**
 * Every account is created with its first role, because an account with no grant opens
 * nothing. The temporary password comes back exactly once, so this dialog stays on screen
 * showing it rather than closing straight into a list.
 */
export function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateUser();
  const { grants } = useAuth();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("marker");
  const [scopeId, setScopeId] = useState("");
  const [created, setCreated] = useState<CreatedUser | undefined>();

  // An account is created with its first role, so the same delegation rule applies here as
  // on the grant dialog: a role at or above the caller's own level is not offered.
  const roleOptions = grantableRoles(grants).map((option) => ({
    value: option,
    label: ROLE_LABELS[option],
  }));

  const scopeType = SCOPE_FOR_ROLE[role];
  const needsScope = scopeType !== "system";
  const canSubmit =
    email.trim().length > 0 && fullName.trim().length >= 2 && (!needsScope || scopeId.length > 0);

  const error = create.error;
  const fieldError = (field: string) => (isApiError(error) ? error.fieldError(field) : undefined);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    create.mutate(
      {
        email: email.trim(),
        fullName: fullName.trim(),
        role: { role, scopeType, scopeId: needsScope ? scopeId : undefined },
      },
      {
        onSuccess: ({ data, message }) => {
          toast.success(message || "Account created.");
          setCreated(data);
        },
      },
    );
  }

  if (created) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{created.user.fullName} is set up</DialogTitle>
            <DialogDescription>
              The account exists and holds its first role. It must change this password before
              anything else opens.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Temporary password</p>
              <SecretField
                label="Temporary password"
                value={created.temporaryPassword}
                emptyText="No password was generated, so use the one you supplied."
              />
              <p className="text-xs text-muted-foreground">
                Send it over something other than the email address it belongs to.
              </p>
            </div>

            <Callout variant="warning" title="This is the only time you will see it">
              Nothing stores it in readable form. If it is lost, the account uses the forgotten
              password link instead.
            </Callout>
          </div>

          <DialogFooter>
            <Button className="h-11 cursor-pointer sm:h-9" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New account</DialogTitle>
          <DialogDescription>
            Staff only. A student in GraderPlus is a record parsed out of a Learn export, never
            an account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <FormError error={error} />

          <FormField
            label="Full name"
            name="fullName"
            required
            autoFocus
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            error={fieldError("fullName")}
          />

          <FormField
            label="Email address"
            name="email"
            type="email"
            inputMode="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            hint="Case insensitive, so one person cannot end up with two accounts."
            error={fieldError("email")}
          />

          <SelectField
            label="First role"
            value={role}
            onValueChange={(value) => {
              setRole(value as Role);
              setScopeId("");
            }}
            options={roleOptions}
            hint="Roles below your own only. More can be granted afterwards, and capability is the union of every grant."
            error={fieldError("role")}
          />

          <ScopePicker
            role={role}
            scopeId={scopeId}
            onScopeIdChange={setScopeId}
            error={fieldError("scopeId")}
          />

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
              isPending={create.isPending}
              pendingLabel="Creating"
              disabled={!canSubmit}
              className="sm:w-auto"
            >
              Create account
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
