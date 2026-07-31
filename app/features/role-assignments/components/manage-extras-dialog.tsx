import { Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Alert } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useAuth } from "~/features/auth/api/auth-context";
import { usePermissionCatalogue } from "~/features/permissions/api/use-permission-catalogue";
import type { PermissionKey, UserRoleAssignmentDetail } from "~/features/permissions/types";
import { useGrantExtraPermission } from "~/features/role-assignments/api/use-grant-extra-permission";
import { useRevokeExtraPermission } from "~/features/role-assignments/api/use-revoke-extra-permission";
import { useScopeOptions } from "~/features/role-assignments/api/use-scope-options";
import {
  grantableExtras,
  permissionKeysAtScope,
  resolveScopeChain,
  roleAssignmentErrorMessage,
} from "~/features/role-assignments/utils";

interface ManageExtrasDialogProps {
  assignment: UserRoleAssignmentDetail | null;
  scopeLabel: string;
  targetUserName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: (apiMessage: string) => void;
}

/**
 * Add or withdraw the additive extras on one existing assignment.
 *
 * Stays open across mutations — adding three permissions shouldn't mean
 * reopening the dialog three times — so it reports each result through
 * `onChanged` rather than closing, and the caller shows a toast.
 *
 * ⚠️ Withdrawing is addressed by the permission's **UUID**, not its key: the
 * route uses a `ParseUUIDPipe`, while the assignment detail carries keys only.
 * The id comes from the catalogue (`GET /permissions`), which is why the
 * withdraw control is disabled until the catalogue has loaded — firing a
 * request with a key in the id position would 400 on the pipe.
 *
 * Extras are purely additive. A template's own defaults can never be
 * subtracted, so they're shown here as fixed context, not as removable chips.
 */
export function ManageExtrasDialog({
  assignment,
  scopeLabel,
  targetUserName,
  open,
  onOpenChange,
  onChanged,
}: ManageExtrasDialogProps) {
  const { permissions: summary } = useAuth();
  const { data: catalogue } = usePermissionCatalogue();
  const { sources } = useScopeOptions();

  const [pendingKey, setPendingKey] = useState<PermissionKey | "">("");
  const grantExtra = useGrantExtraPermission();
  const revokeExtra = useRevokeExtraPermission();

  const chain = useMemo(
    () =>
      assignment
        ? resolveScopeChain(assignment.scopeType, assignment.scopeId, sources)
        : {},
    [assignment, sources],
  );

  // Rule 1 — only keys the grantor holds at a containing scope, minus anything
  // the assignment already has (as a default or an existing extra), so the
  // picker never offers a no-op.
  const addable = useMemo(
    () =>
      grantableExtras(
        catalogue,
        permissionKeysAtScope(summary, chain),
        assignment?.permissionKeys ?? [],
      ),
    [catalogue, summary, chain, assignment],
  );

  const permissionIdsByKey = useMemo(
    () => new Map((catalogue ?? []).map((entry) => [entry.key, entry.id])),
    [catalogue],
  );

  const current = assignment?.extraPermissionKeys ?? [];
  const defaults = (assignment?.permissionKeys ?? []).filter(
    (key) => !current.includes(key),
  );
  const error = grantExtra.error ?? revokeExtra.error;
  const isPending = grantExtra.isPending || revokeExtra.isPending;

  const [dialogNode, setDialogNode] = useState<HTMLDivElement | null>(null);

  function handleAdd() {
    if (!assignment || !pendingKey) return;
    grantExtra.mutate(
      {
        assignmentId: assignment.id,
        permissionKey: pendingKey,
        userId: assignment.userId,
      },
      {
        onSuccess: ({ message }) => {
          setPendingKey("");
          onChanged?.(message);
        },
      },
    );
  }

  function handleWithdraw(key: PermissionKey) {
    const permissionId = permissionIdsByKey.get(key);
    if (!assignment || !permissionId) return;
    revokeExtra.mutate(
      { assignmentId: assignment.id, permissionId, userId: assignment.userId },
      { onSuccess: ({ message }) => onChanged?.(message) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={setDialogNode}>
        <DialogHeader>
          <DialogTitle>Extra permissions</DialogTitle>
          <DialogDescription>
            On top of {targetUserName}'s {assignment?.roleTemplateName} role at{" "}
            {scopeLabel}.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert
            variant="inline"
            status="error"
            timeout={0}
            title="Couldn't change the extra permissions"
            message={roleAssignmentErrorMessage(error)}
          />
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">Added on top</p>
            {current.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                None — this role has only its default permissions.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {current.map((key) => (
                  <li
                    key={key}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1"
                  >
                    <span className="truncate font-mono text-xs">{key}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleWithdraw(key)}
                      disabled={isPending || !permissionIdsByKey.has(key)}
                      aria-label={`Withdraw ${key}`}
                    >
                      <Minus className="h-4 w-4" />
                      Withdraw
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {addable.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="add-extra-permission">Add a permission</Label>
              <div className="flex gap-2">
                <Select
                  value={pendingKey || undefined}
                  onValueChange={(next) => setPendingKey(next as PermissionKey)}
                  disabled={isPending}
                >
                  <SelectTrigger id="add-extra-permission" className="flex-1">
                    <SelectValue placeholder="Pick a permission" />
                  </SelectTrigger>
                  <SelectContent container={dialogNode}>
                    {addable.map((entry) => (
                      <SelectItem key={entry.id} value={entry.key}>
                        {entry.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={handleAdd}
                  disabled={isPending || !pendingKey}
                  data-loading={grantExtra.isPending}
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Only permissions you hold at this level are listed.
              </p>
            </div>
          )}

          {defaults.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">From the role itself</p>
              <p className="text-xs text-muted-foreground">
                These come with the role and can't be removed individually.
              </p>
              <div className="flex flex-wrap gap-1">
                {defaults.map((key) => (
                  <Badge key={key} variant="secondary" className="font-mono text-[10px]">
                    {key}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
