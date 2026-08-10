import { useMemo, useState, type FormEvent } from "react";

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
import { SubmitButton } from "~/components/ui/submit-button";
import { useAuth } from "~/features/auth/api/auth-context";
import { usePermissionCatalogue } from "~/features/permissions/api/use-permission-catalogue";
import { useRoleTemplates } from "~/features/permissions/api/use-role-templates";
import type { PermissionKey, RoleTemplateKey } from "~/features/permissions/types";
import { useCreateRoleAssignment } from "~/features/role-assignments/api/use-create-role-assignment";
import { useScopeOptions } from "~/features/role-assignments/api/use-scope-options";
import { ExtrasFieldset } from "~/features/role-assignments/components/extras-fieldset";
import { RoleTemplatePicker } from "~/features/role-assignments/components/role-template-picker";
import {
  ScopePicker,
  type ScopeSelection,
} from "~/features/role-assignments/components/scope-picker";
import type { RoleAssignmentResponse } from "~/features/role-assignments/types";
import {
  defaultPermissionKeysAt,
  grantableExtras,
  isScopeFieldError,
  permissionKeysAtScope,
  resolveScopeChain,
  roleAssignmentErrorMessage,
} from "~/features/role-assignments/utils";

interface GrantRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetUserName: string;
  onSuccess?: (assignment: RoleAssignmentResponse, apiMessage: string) => void;
}

/**
 * The grant form: scope, then role, then optional extras.
 *
 * Remounted by its caller via a changing `key` rather than resetting its own
 * state in an effect — the convention every form dialog in this repo follows.
 *
 * Re-granting is the same submit: the backend upserts by
 * (user, template, scope), including over a previously revoked row, so there's
 * no separate re-grant path and "already granted" is never a blocking error.
 */
export function GrantRoleDialog({
  open,
  onOpenChange,
  targetUserId,
  targetUserName,
  onSuccess,
}: GrantRoleDialogProps) {
  const { permissions: summary } = useAuth();
  const [scope, setScope] = useState<ScopeSelection | null>(null);
  const [roleTemplateKey, setRoleTemplateKey] = useState<RoleTemplateKey | null>(null);
  const [extras, setExtras] = useState<PermissionKey[]>([]);

  // Portal target for the nested Selects — see ScopePickerProps.container.
  const [dialogNode, setDialogNode] = useState<HTMLDivElement | null>(null);

  const createAssignment = useCreateRoleAssignment();
  const { data: catalogue } = usePermissionCatalogue();
  const { data: templates } = useRoleTemplates();
  const { sources } = useScopeOptions();

  const scopeChosen = Boolean(
    scope && (scope.scopeType === "global" || scope.scopeId),
  );

  // Identifies "which scope" for the remount-on-change keys below — same fix, and same reason,
  // as UserFormPage's `scopeKey` (2026-08-04 BUGS.md entry): without it, Radix Select's internal
  // value-tracking can show a stale role/extras selection after switching scope back to one
  // visited earlier in the same session.
  const scopeKey = scope ? `${scope.scopeType}:${scope.scopeId ?? ""}` : "none";

  const chain = useMemo(
    () =>
      scope ? resolveScopeChain(scope.scopeType, scope.scopeId, sources) : {},
    [scope, sources],
  );

  const selectedTemplate = templates?.find((t) => t.key === roleTemplateKey);

  // The picked template's own defaults at this scope — subtracted below so a permission the
  // template already grants never also shows up as an "extra" (see UserFormPage's identical
  // comment, added the same session this was found and fixed in both places).
  const templateDefaults = useMemo(
    () =>
      scope && selectedTemplate ? defaultPermissionKeysAt(selectedTemplate, scope.scopeType) : [],
    [selectedTemplate, scope],
  );

  // Rule 1: only extras the grantor holds at a scope containing the target, minus the role's
  // own defaults.
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
    // ceiling changes with the scope too — so both reset rather than carrying
    // a now-illegal value into the submit.
    setRoleTemplateKey(null);
    setExtras([]);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!scope || !roleTemplateKey || !scopeChosen) return;

    createAssignment.mutate(
      {
        userId: targetUserId,
        roleTemplateKey,
        scopeType: scope.scopeType,
        // Omitted entirely for global — sending null would trip
        // SCOPE_ID_NOT_ALLOWED.
        ...(scope.scopeId ? { scopeId: scope.scopeId } : {}),
        ...(extras.length ? { extraPermissionKeys: extras } : {}),
      },
      {
        onSuccess: ({ data, message }) => {
          onOpenChange(false);
          onSuccess?.(data, message);
        },
      },
    );
  }

  const error = createAssignment.error;
  const scopeError = isScopeFieldError(error)
    ? roleAssignmentErrorMessage(error)
    : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={setDialogNode}>
        <DialogHeader>
          <DialogTitle>Assign a role</DialogTitle>
          <DialogDescription>
            Give {targetUserName} a role, and choose where it applies.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && !scopeError && (
            <Callout variant="error" title="Couldn't assign the role">
              {roleAssignmentErrorMessage(error)}
            </Callout>
          )}

          <ScopePicker
            value={scope}
            onChange={handleScopeChange}
            disabled={createAssignment.isPending}
            container={dialogNode}
            error={scopeError}
            idPrefix="grant-role"
          />

          {scope && scopeChosen && (
            <RoleTemplatePicker
              key={scopeKey}
              value={roleTemplateKey}
              onChange={setRoleTemplateKey}
              scopeType={scope.scopeType}
              scopeId={scope.scopeId}
              disabled={createAssignment.isPending}
              container={dialogNode}
              idPrefix="grant-role"
            />
          )}

          {roleTemplateKey && (
            <ExtrasFieldset
              key={`${scopeKey}:${roleTemplateKey}`}
              availableExtras={availableExtras}
              selected={extras}
              onToggle={toggleExtra}
              disabled={createAssignment.isPending}
              roleName={selectedTemplate?.name}
            />
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 cursor-pointer sm:h-9"
              onClick={() => onOpenChange(false)}
              disabled={createAssignment.isPending}
            >
              Cancel
            </Button>
            <SubmitButton
              isPending={createAssignment.isPending}
              pendingLabel="Assigning…"
              disabled={!roleTemplateKey || !scopeChosen}
              className="sm:w-auto"
            >
              Assign role
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
