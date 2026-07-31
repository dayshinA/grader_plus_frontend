import { useId, useMemo } from "react";
import { Alert } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
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
import { useRoleTemplates } from "~/features/permissions/api/use-role-templates";
import type { RoleTemplateKey, ScopeType } from "~/features/permissions/types";
import { useScopeOptions } from "~/features/role-assignments/api/use-scope-options";
import {
  bestHierarchyLevelAtScope,
  defaultPermissionKeysAt,
  delegatableTemplates,
  permissionLabel,
  resolveScopeChain,
  SCOPE_TYPE_LABELS,
} from "~/features/role-assignments/utils";

export interface RoleTemplatePickerProps {
  value: RoleTemplateKey | null;
  onChange: (value: RoleTemplateKey) => void;
  /** The already-picked target scope. Rule 2 can't be evaluated without it. */
  scopeType: ScopeType;
  scopeId: string | null;
  disabled?: boolean;
  /** Portal target — required inside a `Dialog`. See `ScopePickerProps.container`. */
  container?: HTMLElement | null;
  /** Set false to drop the "what this confers" preview. @default true */
  showPreview?: boolean;
  idPrefix?: string;
}

/**
 * Picks a role template, offering only what the grantor may legally confer at
 * the given scope, and previewing what the pick confers before it's submitted.
 *
 * ## Rule 2, applied as UX
 *
 * Only templates strictly *junior* to the grantor's best level at this scope
 * are offered — a School Admin never sees "School Admin", a Department Admin
 * never sees "Department Admin". Templates that aren't valid at this scope type
 * at all are filtered out too, which is what prevents a 422
 * `INVALID_SCOPE_FOR_ROLE_TEMPLATE` rather than catching it after submit.
 *
 * A Project Coordinator or Marker (both level 3, the floor of the hierarchy)
 * gets an empty list at every scope. That's permanent and correct, so it
 * renders as an explanation rather than an empty dropdown.
 *
 * ⚠️ Rule 2 governs template *defaults*. Rule 1 — "you can't grant what you
 * don't hold" — applies to the extras layer only and is deliberately **not**
 * applied here. A School Admin can grant a Marker whose defaults include
 * `evaluations.submit` even though a School Admin must never hold it. Inverting
 * this is the exact bug the backend shipped and reverted on 2026-07-30, which
 * left Super Admin as the only account able to staff a module.
 *
 * ## Reuse
 *
 * Two call sites from day one: `GrantRoleDialog`, and Phase 3's create-user
 * form (CH-11), where `POST /users` bundles an assignment carrying the same
 * `roleTemplateKey`. Reuses `Select`, `Label`, `Badge` and `Alert` rather than
 * re-implementing any of them; the permission preview is `Badge` in its
 * `secondary` variant, the same treatment used for read-only metadata elsewhere.
 */
export function RoleTemplatePicker({
  value,
  onChange,
  scopeType,
  scopeId,
  disabled,
  container,
  showPreview = true,
  idPrefix,
}: RoleTemplatePickerProps) {
  const generatedId = useId();
  const prefix = idPrefix ?? generatedId;

  const { permissions: summary } = useAuth();
  const { data: templates, isLoading, isError } = useRoleTemplates();
  const { data: catalogue } = usePermissionCatalogue();
  const { sources } = useScopeOptions();

  const chain = useMemo(
    () => resolveScopeChain(scopeType, scopeId, sources),
    [scopeType, scopeId, sources],
  );

  const options = useMemo(
    () => delegatableTemplates(templates, summary, scopeType, chain),
    [templates, summary, scopeType, chain],
  );

  const selected = options.find((template) => template.key === value) ?? null;
  const preview = selected ? defaultPermissionKeysAt(selected, scopeType) : [];
  const bestLevel = bestHierarchyLevelAtScope(summary, chain);
  const scopeLabel = SCOPE_TYPE_LABELS[scopeType].toLowerCase();

  if (isError) {
    return (
      <Alert
        variant="inline"
        status="error"
        timeout={0}
        title="Couldn't load role templates"
        message="The list of roles couldn't be fetched. Try again in a moment."
      />
    );
  }

  if (!isLoading && options.length === 0) {
    return (
      <Alert
        variant="inline"
        status="info"
        timeout={0}
        title="Nothing to delegate here"
        message={
          bestLevel === null
            ? `You don't hold a role covering this ${scopeLabel}, so you can't assign anyone to it.`
            : "You can only assign roles junior to your own, and there are none below yours at this level."
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`${prefix}-role-template`}>Role</Label>
      <Select
        value={value ?? undefined}
        onValueChange={(next) => onChange(next as RoleTemplateKey)}
        disabled={disabled || isLoading}
      >
        <SelectTrigger id={`${prefix}-role-template`}>
          <SelectValue placeholder={isLoading ? "Loading..." : "Pick a role"} />
        </SelectTrigger>
        <SelectContent container={container}>
          {options.map((template) => (
            <SelectItem key={template.key} value={template.key}>
              {template.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selected && (
        <p className="text-xs text-muted-foreground">{selected.description}</p>
      )}

      {showPreview && selected && (
        <div className="mt-1 flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            This grants {preview.length} permission{preview.length === 1 ? "" : "s"} at
            this {scopeLabel}:
          </p>
          <div className="flex flex-wrap gap-1">
            {preview.map((key) => (
              <Badge key={key} variant="secondary" title={permissionLabel(key, catalogue)}>
                {key}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
