import { useId, useMemo } from "react";

import { Callout } from "~/components/ui/callout";
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
import type {
  PermissionCatalogEntry,
  PermissionKey,
  RoleTemplateKey,
  ScopeType,
} from "~/features/permissions/types";
import { useScopeOptions } from "~/features/role-assignments/api/use-scope-options";
import {
  bestHierarchyLevelAtScope,
  defaultPermissionKeysAt,
  delegatableTemplates,
  groupPermissionsByDomain,
  permissionDescription,
  permissionTitle,
  resolveScopeChain,
  roleTemplateDescription,
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
 * A department-scope Project Coordinator or a Marker (level 4, the floor of the
 * hierarchy) gets an empty list at every scope — permanent and correct, rendered as
 * an explanation rather than an empty dropdown. A **module**-scope Project
 * Coordinator is the one exception: since the 2026-08-03 redesign moved Marker to a
 * strict child of Coordinator, they can delegate Marker at their own module.
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
 * `roleTemplateKey`. Reuses `Select`, `Label` and `Callout` rather than
 * re-implementing any of them.
 *
 * The permission-defaults preview (2026-08-04) groups by domain (`groupPermissionsByDomain`) the
 * same way `ExtrasFieldset` groups its extras, and renders each key via the same
 * `permissionTitle`/`permissionDescription` friendly-copy map that component now also uses — no
 * more raw keys, a `Badge`-per-permission list, or a permission count. This is deliberately
 * read-only (no checkboxes): these are the template's unconditional defaults, not something a
 * System Administrator is meant to be able to toggle off while creating a user — see
 * `ExtrasFieldset` for the layer that actually is optional.
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
  const preview = useMemo(
    () => (selected ? defaultPermissionKeysAt(selected, scopeType) : []),
    [selected, scopeType],
  );
  const bestLevel = bestHierarchyLevelAtScope(summary, chain);
  const scopeLabel = SCOPE_TYPE_LABELS[scopeType].toLowerCase();

  const previewByDomain = useMemo(
    () => groupPermissionsByDomain(preview, (key) => key),
    [preview],
  );

  if (isError) {
    return (
      <Callout variant="error" title="Couldn't load role templates">
        The list of roles couldn't be fetched. Try again in a moment.
      </Callout>
    );
  }

  if (!isLoading && options.length === 0) {
    return (
      <Callout title="Nothing to delegate here">
        {bestLevel === null
          ? `You don't hold a role covering this ${scopeLabel}, so you can't assign anyone to it.`
          : "You can only assign roles junior to your own, and there are none below yours at this level."}
      </Callout>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`${prefix}-role-template`}>Role</Label>
      <Select
        value={value ?? undefined}
        onValueChange={(next) => onChange(next as RoleTemplateKey)}
        disabled={disabled || isLoading}
      >
        <SelectTrigger id={`${prefix}-role-template`}>
          <SelectValue placeholder={isLoading ? "Loading…" : "Pick a role"} />
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
        <p className="text-xs text-muted-foreground">
          {roleTemplateDescription(selected.key, selected.description)}
        </p>
      )}

      {showPreview && selected && (
        <div className="mt-1 flex flex-col gap-3">
          <p className="text-xs font-medium text-muted-foreground">Default permissions</p>
          {previewByDomain.map((domain) => (
            <PermissionPreviewGroup
              key={domain.label}
              label={domain.label}
              keys={domain.items}
              catalogue={catalogue}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PermissionPreviewGroupProps {
  label: string;
  keys: PermissionKey[];
  catalogue?: readonly PermissionCatalogEntry[];
}

/**
 * One category's slice of a role template's default-permission preview — read-only, so unlike
 * `ExtrasFieldset`'s matching groups this has no checkboxes and doesn't show the raw key: a
 * friendly title (`permissionTitle`) plus a one-line description (`permissionDescription`) is
 * everything a viewer needs for something they can't toggle anyway.
 */
function PermissionPreviewGroup({ label, keys, catalogue }: PermissionPreviewGroupProps) {
  if (keys.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-col gap-2">
        {keys.map((key) => (
          <div key={key} className="flex flex-col">
            <span className="text-sm font-medium text-foreground">{permissionTitle(key)}</span>
            <span className="text-xs text-muted-foreground">
              {permissionDescription(key, catalogue)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
