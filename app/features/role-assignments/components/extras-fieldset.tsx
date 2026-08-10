import { useMemo } from "react";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import type { PermissionCatalogEntry, PermissionKey } from "~/features/permissions/types";
import {
  groupPermissionsByDomain,
  permissionDescription,
  permissionTitle,
} from "~/features/role-assignments/utils";

export interface ExtrasFieldsetProps {
  /** Already filtered to what the grantor may legally offer AND excludes anything the picked
   * role template already grants by default — see `grantableExtras` in `utils.ts`. */
  availableExtras: PermissionCatalogEntry[];
  selected: PermissionKey[];
  onToggle: (key: PermissionKey) => void;
  disabled?: boolean;
  /** The role template's display name (e.g. "School Admin"), interpolated into the fieldset's own
   * description so it reads as "beyond the default X role" rather than a bare "the role's
   * defaults". Omit for a caller with no role picked yet — falls back to generic copy. */
  roleName?: string;
}

/**
 * The extras layer of a role assignment: a checkbox list of permissions on top of a role
 * template's defaults, grouped by domain (`groupPermissionsByDomain` — the same grouping
 * `RoleTemplatePicker`'s read-only defaults preview uses, since the two sit on the same screen and
 * should read as one system rather than two different taxonomies).
 *
 * Extracted from `GrantRoleDialog` (Phase 2) when `UserFormDialog`'s (now `UserFormPage`'s)
 * create-user form (CH-11, Phase 3) became a second consumer — `POST /users` bundles the same
 * `extraPermissionKeys` field as `POST /role-assignments`. Callers compute `availableExtras`
 * themselves via `grantableExtras(catalogue, permissionKeysAtScope(summary, chain),
 * templateDefaults)` from `~/features/role-assignments/utils` — Rule 1 (the grantor must already
 * hold what they're conferring) **and** excluding the template's own defaults (2026-08-04 fix —
 * see BUGS.md) both live there, not in this component.
 *
 * Renders nothing when `availableExtras` is empty — callers gate on that themselves too, but the
 * component is safe to render unconditionally.
 *
 * Still raw `<input type="checkbox">` markup, not a shared `Checkbox` primitive — there isn't one
 * in this repo yet, and inventing one for two call sites would need its own doc and preview.
 * Worth extracting when a third consumer appears.
 */
export function ExtrasFieldset({
  availableExtras,
  selected,
  onToggle,
  disabled,
  roleName,
}: ExtrasFieldsetProps) {
  const groups = useMemo(
    () => groupPermissionsByDomain(availableExtras, (entry) => entry.key),
    [availableExtras],
  );

  if (availableExtras.length === 0) return null;

  return (
    <fieldset className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <legend className="px-1 text-sm font-medium">Additional permissions (optional)</legend>
      <p className="text-xs text-muted-foreground">
        Grant permissions beyond the default {roleName ? `${roleName} role` : "role's defaults"}.
      </p>
      {groups.map((group) => (
        <ExtrasGroup
          key={group.label}
          label={group.label}
          entries={group.items}
          selected={selected}
          onToggle={onToggle}
          disabled={disabled}
        />
      ))}
    </fieldset>
  );
}

interface ExtrasGroupProps {
  label: string;
  entries: { id: string; key: PermissionKey; description: string }[];
  selected: PermissionKey[];
  onToggle: (key: PermissionKey) => void;
  disabled?: boolean;
}

function ExtrasGroup({ label, entries, selected, onToggle, disabled }: ExtrasGroupProps) {
  if (entries.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-col gap-1">
        {entries.map((entry) => (
          <Label
            key={entry.id}
            htmlFor={`extra-${entry.key}`}
            className="flex cursor-pointer items-start gap-2 text-sm font-normal"
          >
            <Checkbox
              id={`extra-${entry.key}`}
              className="mt-0.5 shrink-0"
              checked={selected.includes(entry.key)}
              onCheckedChange={() => onToggle(entry.key)}
              disabled={disabled}
            />
            <span className="flex flex-col">
              <span className="font-medium text-foreground">{permissionTitle(entry.key)}</span>
              <span className="text-xs text-muted-foreground">
                {permissionDescription(entry.key)}
              </span>
            </span>
          </Label>
        ))}
      </div>
    </div>
  );
}
