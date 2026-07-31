import { useMemo, useState, type FormEvent } from "react";
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
import { useAuth } from "~/features/auth/api/auth-context";
import { usePermissionCatalogue } from "~/features/permissions/api/use-permission-catalogue";
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
  const { sources } = useScopeOptions();

  const scopeChosen = Boolean(
    scope && (scope.scopeType === "global" || scope.scopeId),
  );

  const chain = useMemo(
    () =>
      scope ? resolveScopeChain(scope.scopeType, scope.scopeId, sources) : {},
    [scope, sources],
  );

  // Rule 1: only extras the grantor holds at a scope containing the target.
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

        {error && !scopeError && (
          <Alert
            variant="inline"
            status="error"
            timeout={0}
            title="Couldn't assign the role"
            message={roleAssignmentErrorMessage(error)}
          />
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              availableExtras={availableExtras}
              selected={extras}
              onToggle={toggleExtra}
              disabled={createAssignment.isPending}
            />
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createAssignment.isPending || !roleTemplateKey || !scopeChosen
              }
              data-loading={createAssignment.isPending}
            >
              {createAssignment.isPending ? "Assigning..." : "Assign role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
