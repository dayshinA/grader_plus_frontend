import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";

import { BackLink } from "~/components/ui/back-link";
import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import { Card, CardContent } from "~/components/ui/card";
import { FormField } from "~/components/ui/form-field";
import { Label } from "~/components/ui/label";
import { PageHeader } from "~/components/ui/page-header";
import { SubmitButton } from "~/components/ui/submit-button";
import { useAuth } from "~/features/auth/api/auth-context";
import { usePermissionCatalogue } from "~/features/permissions/api/use-permission-catalogue";
import { useRoleTemplates } from "~/features/permissions/api/use-role-templates";
import type {
  PermissionKey,
  RoleTemplateKey,
} from "~/features/permissions/types";
import { useScopeOptions } from "~/features/role-assignments/api/use-scope-options";
import { ExtrasFieldset } from "~/features/role-assignments/components/extras-fieldset";
import { RoleTemplatePicker } from "~/features/role-assignments/components/role-template-picker";
import {
  ScopePicker,
  type ScopeSelection,
} from "~/features/role-assignments/components/scope-picker";
import {
  defaultPermissionKeysAt,
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
import { isApiError } from "~/lib/api-client";

export interface UserFormPageProps {
  mode: "create" | "edit";
  /** Required when mode is "edit" — the user being edited. */
  user?: UserResponse;
}

const EMPTY_FORM = {
  email: "",
  fullName: "",
  learnId: "",
  password: "",
};

/**
 * Full page rather than a modal (converted from `UserFormDialog` 2026-08-04) — reached via
 * `/super-admin/users/new` and `/super-admin/users/:userId/edit`, not rendered inline by
 * `UsersPage` any more. On success it navigates back to `/super-admin/users`, handing the
 * confirmation toast across via router `state` (`UsersPage` reads `location.state.toast` once
 * on mount and clears it) since there's no longer a shared parent to lift an `onSuccess`
 * callback into.
 *
 * Create mode bundles an initial role assignment into `POST /users` (`CreateUserRequest`), so it
 * composes the same `ScopePicker` → `RoleTemplatePicker` → `ExtrasFieldset` sequence
 * `GrantRoleDialog` uses — scope first, since Rule 2 can't say which templates are delegatable
 * until the target scope is known. Edit mode never touches role at all: `PATCH /users/:id`
 * rejects the field outright, so role changes go through the delegation screen
 * (`/super-admin/role-assignments`) instead.
 *
 * No `container` prop threaded into the nested Selects — that was only needed to escape a
 * `Dialog`'s focus trap (see `ScopePickerProps.container`'s doc comment); a plain page has no
 * focus trap, so they portal to `document.body` by default.
 */
export function UserFormPage({ mode, user }: UserFormPageProps) {
  const navigate = useNavigate();

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
  const [roleTemplateKey, setRoleTemplateKey] =
    useState<RoleTemplateKey | null>(null);
  const [extras, setExtras] = useState<PermissionKey[]>([]);

  const { permissions: summary } = useAuth();
  const { data: catalogue } = usePermissionCatalogue();
  const { data: templates } = useRoleTemplates();
  const { sources } = useScopeOptions();

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const mutation = mode === "create" ? createUser : updateUser;
  const isPending = mutation.isPending;

  const scopeChosen = Boolean(
    scope && (scope.scopeType === "global" || scope.scopeId),
  );

  // Identifies "which scope" for the remount-on-change keys below — distinct scope type
  // and/or id both count as a different scope.
  const scopeKey = scope ? `${scope.scopeType}:${scope.scopeId ?? ""}` : "none";

  const chain = useMemo(
    () =>
      scope ? resolveScopeChain(scope.scopeType, scope.scopeId, sources) : {},
    [scope, sources],
  );

  const selectedTemplate = templates?.find((t) => t.key === roleTemplateKey);

  // The picked template's own defaults at this scope — subtracted below so a permission the
  // template already grants (e.g. School Admin's users.create) never also shows up as an
  // "extra", which would read as if it were optional when it's actually unconditional.
  const templateDefaults = useMemo(
    () =>
      scope && selectedTemplate ? defaultPermissionKeysAt(selectedTemplate, scope.scopeType) : [],
    [selectedTemplate, scope],
  );

  // Rule 1: only extras the grantor holds at a scope containing the target, minus the role's
  // own defaults — same computation GrantRoleDialog uses for the same reason.
  const availableExtras = useMemo(
    () =>
      grantableExtras(catalogue, permissionKeysAtScope(summary, chain), templateDefaults),
    [catalogue, summary, chain, templateDefaults],
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

  /** `UsersPage` reads this once on mount and fires it as a toast — see its own comment. */
  function goToUsersWithToast(title: string, message: string) {
    navigate("/super-admin/users", { state: { toast: { title, message } } });
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
            goToUsersWithToast(
              message,
              `${created.fullName} can now sign in with their temporary password.`,
            );
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
          goToUsersWithToast(
            message,
            `${updated.fullName}'s details have been saved.`,
          );
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
    mode === "create" && isScopeFieldError(error)
      ? roleAssignmentErrorMessage(error)
      : undefined;

  const fieldError = (name: string) =>
    isApiError(error) ? error.fieldError(name) : undefined;

  return (
    <div className="space-y-6">
      <BackLink fallback={{ to: "/super-admin/users", label: "Users" }} />

      <PageHeader
        title={mode === "create" ? "Add user" : "Edit user"}
        description={
          mode === "create"
            ? "Create an account and assign it a role. Set a password below (or generate one) and share it with them yourself."
            : "Update this user's details. Leave the password blank to keep it unchanged."
        }
      />

      <Card className="mx-auto w-full max-w-xl">
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && !scopeError && (
              <Callout
                variant="error"
                title={mode === "create" ? "Couldn't create user" : "Couldn't update user"}
              >
                {roleAssignmentErrorMessage(error)}
              </Callout>
            )}

            <FormField
              label="Email"
              id="user-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              error={fieldError("email")}
            />

            <FormField
              label="Full name"
              id="user-full-name"
              name="fullName"
              autoComplete="name"
              required
              value={form.fullName}
              onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
              error={fieldError("fullName")}
            />

            {mode === "create" ? (
              <>
                <ScopePicker
                  value={scope}
                  onChange={handleScopeChange}
                  disabled={isPending}
                  error={scopeError}
                  idPrefix="user-form"
                />

                {scope && scopeChosen && (
                  <RoleTemplatePicker
                    // Forces a clean remount on every distinct scope — belt-and-braces
                    // alongside handleScopeChange's state reset above. Without this, the
                    // underlying Radix Select toggles between controlled (`value` set) and
                    // uncontrolled (`value={undefined}` while nothing is picked yet) as
                    // roleTemplateKey resets to null, and Radix's own internal
                    // last-known-value tracking can otherwise show a stale selection —
                    // and with it a stale (or empty) extras/preview — after switching back
                    // to a scope visited earlier in the same session. A `key` change is the
                    // one thing guaranteed to clear that internal state.
                    key={scopeKey}
                    value={roleTemplateKey}
                    onChange={setRoleTemplateKey}
                    scopeType={scope.scopeType}
                    scopeId={scope.scopeId}
                    disabled={isPending}
                    idPrefix="user-form"
                  />
                )}

                {roleTemplateKey && (
                  <ExtrasFieldset
                    key={`${scopeKey}:${roleTemplateKey}`}
                    availableExtras={availableExtras}
                    selected={extras}
                    onToggle={toggleExtra}
                    disabled={isPending}
                    roleName={selectedTemplate?.name}
                  />
                )}
              </>
            ) : (
              <div className="space-y-2">
                <Label>Role</Label>
                <p className="text-sm text-muted-foreground">
                  Role changes are made from the{" "}
                  <Link
                    to={user ? `/super-admin/role-assignments?userId=${user.id}` : "#"}
                    className="font-medium text-primary underline underline-offset-4"
                  >
                    delegation screen
                  </Link>
                  , not here.
                </p>
              </div>
            )}

            <FormField
              label="Learn ID"
              id="user-learn-id"
              name="learnId"
              hint="Optional. Used to match this account up with Learn."
              value={form.learnId}
              onChange={(event) => setForm((prev) => ({ ...prev, learnId: event.target.value }))}
              error={fieldError("learnId")}
            />

            <div className="space-y-2">
              <FormField
                label={mode === "create" ? "Password" : "New password"}
                id="user-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required={mode === "create"}
                minLength={8}
                hint={
                  mode === "create"
                    ? "At least 8 characters. Share it with them yourself — nothing is emailed."
                    : "Leave blank to keep the current password."
                }
                value={form.password}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, password: event.target.value }))
                }
                error={fieldError("password")}
              />
              <Button
                className="h-auto cursor-pointer p-0 text-xs"
                onClick={() =>
                  setForm((prev) => ({ ...prev, password: generateSecurePassword() }))
                }
                type="button"
                variant="link"
              >
                Generate a secure password
              </Button>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="lg"
                asChild
                className="h-11 cursor-pointer sm:h-9"
              >
                <Link to="/super-admin/users">Cancel</Link>
              </Button>
              <SubmitButton
                isPending={isPending}
                pendingLabel="Saving…"
                disabled={mode === "create" && (!roleTemplateKey || !scopeChosen)}
                className="sm:w-auto"
              >
                {mode === "create" ? "Create user" : "Save changes"}
              </SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
