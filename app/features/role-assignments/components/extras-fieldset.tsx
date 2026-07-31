import { Badge } from "~/components/ui/badge";
import { Label } from "~/components/ui/label";
import type { PermissionCatalogEntry, PermissionKey } from "~/features/permissions/types";

export interface ExtrasFieldsetProps {
  /** Already filtered to what the grantor may legally offer — see `grantableExtras` in `utils.ts`. */
  availableExtras: PermissionCatalogEntry[];
  selected: PermissionKey[];
  onToggle: (key: PermissionKey) => void;
  disabled?: boolean;
}

/**
 * The extras layer of a role assignment: a checkbox list of permissions on top of a role
 * template's defaults, split into "Day-to-day" (functional) and "Administrative" groups.
 *
 * Extracted from `GrantRoleDialog` (Phase 2) when `UserFormDialog`'s create-user form (CH-11,
 * Phase 3) became a second consumer — `POST /users` bundles the same `extraPermissionKeys` field
 * as `POST /role-assignments`. Callers compute `availableExtras` themselves via
 * `grantableExtras(catalogue, permissionKeysAtScope(summary, chain))` from
 * `~/features/role-assignments/utils` — Rule 1 (the grantor must already hold what they're
 * conferring) lives there, not in this component.
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
}: ExtrasFieldsetProps) {
  if (availableExtras.length === 0) return null;

  const functionalExtras = availableExtras.filter((e) => e.category === "functional");
  const administrativeExtras = availableExtras.filter((e) => e.category === "administrative");

  return (
    <fieldset className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <legend className="px-1 text-sm font-medium">Extra permissions (optional)</legend>
      <p className="text-xs text-muted-foreground">
        On top of the role's defaults. Only permissions you hold here are listed.
      </p>
      <ExtrasGroup
        label="Day-to-day"
        entries={functionalExtras}
        selected={selected}
        onToggle={onToggle}
        disabled={disabled}
      />
      <ExtrasGroup
        label="Administrative"
        entries={administrativeExtras}
        selected={selected}
        onToggle={onToggle}
        disabled={disabled}
      />
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
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-col gap-1">
        {entries.map((entry) => (
          <Label
            key={entry.id}
            htmlFor={`extra-${entry.key}`}
            className="flex items-start gap-2 text-sm font-normal"
          >
            <input
              id={`extra-${entry.key}`}
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 accent-primary"
              checked={selected.includes(entry.key)}
              onChange={() => onToggle(entry.key)}
              disabled={disabled}
            />
            <span className="flex flex-col">
              <span>{entry.description}</span>
              <Badge variant="outline" className="mt-0.5 w-fit font-mono text-[10px]">
                {entry.key}
              </Badge>
            </span>
          </Label>
        ))}
      </div>
    </div>
  );
}
