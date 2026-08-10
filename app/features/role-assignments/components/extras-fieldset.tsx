import { Loader2 } from "lucide-react";
import { useMemo, type ReactNode } from "react";
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
  /** Overrides the legend. Default: "Additional permissions (optional)" — right for a form where
   * the extras are one optional step, wrong for a screen that is *only* about extras. */
  legend?: string;
  /** Overrides the line under the legend. Ignored (along with `roleName`) when `null`. */
  description?: ReactNode;
  /** Rows with a write in flight: disabled, with a spinner and "Saving…" beside the label. For an
   * apply-on-toggle caller (`ManageExtrasPage`); a batch form leaves this empty. */
  pendingKeys?: readonly PermissionKey[];
  /** Rows to disable individually, on top of `pendingKeys` and the blanket `disabled`. Used for a
   * permission that can't currently be acted on — e.g. an extra whose catalogue entry (and so its
   * UUID, which the withdraw route needs) hasn't loaded. */
  disabledKeys?: readonly PermissionKey[];
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
 * Two shapes of caller, which is what `pendingKeys` exists for:
 *
 * - **Batch** (`GrantRoleDialog`, `UserFormPage`) — `selected` is local form state, nothing is
 *   written until the surrounding form submits.
 * - **Apply-on-toggle** (`ManageExtrasPage`, 2026-08-10) — `selected` is server state read back
 *   from `GET /role-assignments`, and each toggle is its own request. That caller passes the
 *   in-flight keys so the row it just clicked shows it's saving instead of appearing inert.
 *
 * Renders nothing when `availableExtras` is empty — callers gate on that themselves too, but the
 * component is safe to render unconditionally.
 */
export function ExtrasFieldset({
  availableExtras,
  selected,
  onToggle,
  disabled,
  roleName,
  legend,
  description,
  pendingKeys,
  disabledKeys,
}: ExtrasFieldsetProps) {
  const groups = useMemo(
    () => groupPermissionsByDomain(availableExtras, (entry) => entry.key),
    [availableExtras],
  );

  if (availableExtras.length === 0) return null;

  return (
    <fieldset className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <legend className="px-1 text-sm font-medium">
        {legend ?? "Additional permissions (optional)"}
      </legend>
      {description !== null && (
        <p className="text-xs text-muted-foreground">
          {description ??
            `Grant permissions beyond the default ${roleName ? `${roleName} role` : "role's defaults"}.`}
        </p>
      )}
      {groups.map((group) => (
        <ExtrasGroup
          key={group.label}
          label={group.label}
          entries={group.items}
          selected={selected}
          onToggle={onToggle}
          disabled={disabled}
          pendingKeys={pendingKeys}
          disabledKeys={disabledKeys}
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
  pendingKeys?: readonly PermissionKey[];
  disabledKeys?: readonly PermissionKey[];
}

function ExtrasGroup({
  label,
  entries,
  selected,
  onToggle,
  disabled,
  pendingKeys,
  disabledKeys,
}: ExtrasGroupProps) {
  if (entries.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-col gap-1">
        {entries.map((entry) => {
          const isPending = pendingKeys?.includes(entry.key) ?? false;
          return (
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
                disabled={disabled || isPending || (disabledKeys?.includes(entry.key) ?? false)}
              />
              <span className="flex flex-col">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  {permissionTitle(entry.key)}
                  {isPending && (
                    <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                      <Loader2
                        className="size-3 animate-spin motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                      Saving…
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {permissionDescription(entry.key)}
                </span>
              </span>
            </Label>
          );
        })}
      </div>
    </div>
  );
}
