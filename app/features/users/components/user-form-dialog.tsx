import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Alert } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { PasswordInput } from "~/components/ui/password-input";
import { useAuth } from "~/features/auth/api/auth-context";
import { usePermissionCatalogue } from "~/features/permissions/api/use-permission-catalogue";
import type { PermissionKey, RoleTemplateKey } from "~/features/permissions/types";
import { useScopeOptions } from "~/features/role-assignments/api/use-scope-options";
import { ExtrasFieldset } from "~/features/role-assignments/components/extras-fieldset";
import { RoleTemplatePicker } from "~/features/role-assignments/components/role-template-picker";
import {
  ScopePicker,
  type ScopeSelection,
} from "~/features/role-assignments/components/scope-picker";
import {
  grantableExtras,
  isScopeFieldError,
  permissionKeysAtScope,
  resolveScopeChain,
  roleAssignmentErrorMessage,
} from "~/features/role-assignments/utils";
import { useCreateUser } from "~/features/users/api/use-create-user";
import { useUpdateUser } from "~/features/users/api/use-update-user";
import type { UserResponse } from "~/features/users/types";
import { generateSecurePassword } from "~/utils/generate-password";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  /** Required when mode is "edit" — the user being edited. */
  user?: UserResponse;
  /** Called after a successful create/update, once the dialog has closed —
   * `apiMessage` is the backend's own confirmation message (see decision #31). */
  onSuccess?: (mode: "create" | "edit", user: UserResponse, apiMessage: string) => void;
}

const EMPTY_FORM = {
  email: "",
  fullName: "",
  learnId: "",
  password: "",
};

/**
 * Note: this component is remounted by its caller (via a `key` that changes
 * every time the dialog is opened) rather than resetting its own state in an
 * effect — see `users-page.tsx`'s `formDialogNonce`. That means form fields
 * and mutation state both start fresh on every open, purely from initial
 * render, with no synchronization effect needed.
 *
 * Create mode bundles an initial role assignment into `POST /users`
 * (`CreateUserRequest`), so it composes the same `ScopePicker` →
 * `RoleTemplatePicker` → `ExtrasFieldset` sequence `GrantRoleDialog` uses —
 * scope first, since Rule 2 can't say which templates are delegatable until
 * the target scope is known. Edit mode never touches role at all: `PATCH
 * /users/:id` rejects the field outright, so role changes go through the
 * delegation screen (`/super-admin/role-assignments`) instead.
 */
export function UserFormDialog({
  open,
  onOpenChange,
  mode,
  user,
  onSuccess,
}: UserFormDialogProps) {
  const [form, setForm] = useState(() =>
    mode === "edit" && user
      ? {
          email: user.email,
          fullName: user.fullName,
          learnId: user.learnId ?? "",
          password: "",
        }
      : EMPTY_FORM,
  );

  // The bundled role assignment — create mode only.
  const [scope, setScope] = useState<ScopeSelection | null>(null);
  const [roleTemplateKey, setRoleTemplateKey] = useState<RoleTemplateKey | null>(null);
  const [extras, setExtras] = useState<PermissionKey[]>([]);

  // Passed to the nested Selects below as their portal container — see
  // SelectContentProps.container's doc comment for why this is needed
  // (Dialog's focus-trap vs. a document.body-portaled Select popover).
  const [dialogNode, setDialogNode] = useState<HTMLDivElement | null>(null);

  const { permissions: summary } = useAuth();
  const { data: catalogue } = usePermissionCatalogue();
  const { sources } = useScopeOptions();

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const mutation = mode === "create" ? createUser : updateUser;
  const isPending = mutation.isPending;

  const scopeChosen = Boolean(scope && (scope.scopeType === "global" || scope.scopeId));

  const chain = useMemo(
    () => (scope ? resolveScopeChain(scope.scopeType, scope.scopeId, sources) : {}),
    [scope, sources],
  );

  // Rule 1: only extras the grantor holds at a scope containing the target — same computation
  // GrantRoleDialog uses for the same reason.
  const availableExtras = useMemo(
    () => grantableExtras(catalogue, permissionKeysAtScope(summary, chain)),
    [catalogue, summary, chain],
  );

  function toggleExtra(key: PermissionKey) {
    setExtras((current) =>
      current.includes(key)
        ? current.filter((existing) => existing !== key)
        : [...current, key],
    );
  }

  function handleScopeChange(next: ScopeSelection) {
    setScope(next);
    // A template valid at one scope may be invalid at another, and the extras
    // ceiling changes with the scope too — reset both rather than carrying a
    // now-illegal value into the submit.
    setRoleTemplateKey(null);
    setExtras([]);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mode === "create") {
      if (!scope || !roleTemplateKey || !scopeChosen) return;

      createUser.mutate(
        {
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          roleTemplateKey,
          scopeType: scope.scopeType,
          // Omitted entirely for global — sending null would trip SCOPE_ID_NOT_ALLOWED.
          ...(scope.scopeId ? { scopeId: scope.scopeId } : {}),
          ...(extras.length ? { extraPermissionKeys: extras } : {}),
          learnId: form.learnId || null,
        },
        {
          onSuccess: ({ data: created, message }) => {
            onOpenChange(false);
            onSuccess?.("create", created, message);
          },
        },
      );
      return;
    }

    if (!user) return;
    updateUser.mutate(
      {
        id: user.id,
        request: {
          email: form.email,
          fullName: form.fullName,
          learnId: form.learnId || null,
          ...(form.password ? { password: form.password } : {}),
        },
      },
      {
        onSuccess: ({ data: updated, message }) => {
          onOpenChange(false);
          onSuccess?.("edit", updated, message);
        },
      },
    );
  }

  const error = mutation.error;
  // Only reachable in create mode — the bundled role assignment is the only place these codes can
  // come from. `roleAssignmentErrorMessage` degrades gracefully for any other code (e.g.
  // email-taken) by falling back to the backend's own message, so it's safe to use unconditionally
  // for the general error banner below rather than writing a second mapping.
  const scopeError =
    mode === "create" && isScopeFieldError(error) ? roleAssignmentErrorMessage(error) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={setDialogNode}>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add user" : "Edit user"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new account and assign it a role. Set a password below (or generate one) and share it with them manually — there's no email delivery."
              : "Update this user's details. Leave the password blank to keep it unchanged."}
          </DialogDescription>
        </DialogHeader>

        {error && !scopeError && (
          <Alert
            variant="inline"
            status="error"
            timeout={0}
            title={mode === "create" ? "Couldn't create user" : "Couldn't update user"}
            message={roleAssignmentErrorMessage(error)}
          />
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-full-name">Full name</Label>
            <Input
              id="user-full-name"
              autoComplete="name"
              required
              value={form.fullName}
              onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
            />
          </div>

          {mode === "create" ? (
            <>
              <ScopePicker
                value={scope}
                onChange={handleScopeChange}
                disabled={isPending}
                container={dialogNode}
                error={scopeError}
                idPrefix="user-form"
              />

              {scope && scopeChosen && (
                <RoleTemplatePicker
                  value={roleTemplateKey}
                  onChange={setRoleTemplateKey}
                  scopeType={scope.scopeType}
                  scopeId={scope.scopeId}
                  disabled={isPending}
                  container={dialogNode}
                  idPrefix="user-form"
                />
              )}

              {roleTemplateKey && (
                <ExtrasFieldset
                  availableExtras={availableExtras}
                  selected={extras}
                  onToggle={toggleExtra}
                  disabled={isPending}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label>Role</Label>
              <p className="text-sm text-muted-foreground">
                Role changes are made from the{" "}
                <Link
                  to={user ? `/super-admin/role-assignments?userId=${user.id}` : "#"}
                  onClick={() => onOpenChange(false)}
                  className="font-medium text-primary underline underline-offset-2"
                >
                  delegation screen
                </Link>
                , not here.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-learn-id">Learn ID (optional)</Label>
            <Input
              id="user-learn-id"
              value={form.learnId}
              onChange={(event) => setForm((prev) => ({ ...prev, learnId: event.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="user-password">
                {mode === "create" ? "Password" : "New password (leave blank to keep current)"}
              </Label>
              <Button
                className="h-auto p-0 text-xs"
                onClick={() =>
                  setForm((prev) => ({ ...prev, password: generateSecurePassword() }))
                }
                type="button"
                variant="link"
              >
                Generate secure password
              </Button>
            </div>
            <PasswordInput
              id="user-password"
              autoComplete="new-password"
              required={mode === "create"}
              minLength={8}
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || (mode === "create" && (!roleTemplateKey || !scopeChosen))}
              data-loading={isPending}
            >
              {isPending ? "Saving..." : mode === "create" ? "Create" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
