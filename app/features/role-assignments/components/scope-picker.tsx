import { useId } from "react";
import { Callout } from "~/components/ui/callout";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { ScopeType } from "~/features/permissions/types";
import { useScopeOptions } from "~/features/role-assignments/api/use-scope-options";
import { SCOPE_TYPE_LABELS } from "~/features/role-assignments/utils";

/** Where a role is being granted. `scopeId` is always null for `global`. */
export interface ScopeSelection {
  scopeType: ScopeType;
  scopeId: string | null;
}

export interface ScopePickerProps {
  value: ScopeSelection | null;
  onChange: (value: ScopeSelection) => void;
  /**
   * Restricts the scope-type dropdown. Defaults to every type the grantor can
   * target (global only if they hold a global assignment). Pass a narrower list
   * to constrain it further — e.g. a caller that only ever grants at module
   * scope.
   */
  allowedScopeTypes?: ScopeType[];
  disabled?: boolean;
  /** Field-level error text, e.g. from a 422 `SCOPE_ID_REQUIRED`. */
  error?: string;
  /**
   * Portal target for the dropdowns. Required when rendered inside a `Dialog` —
   * a `document.body` portal escapes the dialog's focus trap and the popover
   * becomes unusable. Same pattern every existing form dialog in this repo uses.
   */
  container?: HTMLElement | null;
  idPrefix?: string;
}

const SCOPE_TYPE_HINTS: Record<ScopeType, string> = {
  global: "Applies system-wide. Only a System Administrator can confer this.",
  school: "Applies to the school and everything inside it.",
  department: "Applies to the department and every module in it.",
  module: "Applies to one module only.",
};

/**
 * Picks a `scopeType` and then the matching `scopeId` — the "where" half of a
 * role assignment.
 *
 * ## Reuse
 *
 * Built for two call sites from day one: `GrantRoleDialog` on the delegation
 * screen, and Phase 3's create-user form (CH-11), where `POST /users` bundles a
 * role assignment with the same `scopeType`/`scopeId` fields. Nothing here is
 * specific to either.
 *
 * ## Composition
 *
 * Reuses `Select`, `Label` and `Alert` rather than re-implementing a dropdown,
 * a label or an error banner. Option sourcing, containment filtering and the
 * unnamed-scope fallback all live in `useScopeOptions` — see its comment for
 * why the naive "just render `GET /departments`" version is wrong.
 *
 * ## Ordering note
 *
 * Scope is deliberately picked **before** the role template, the reverse of the
 * original Phase 2 outline. Rule 2 can't say which templates are delegatable
 * until the target scope is known, so scope-first is the only order in which
 * `RoleTemplatePicker` can show a correct list rather than one that produces a
 * 403 on submit.
 */
export function ScopePicker({
  value,
  onChange,
  allowedScopeTypes,
  disabled,
  error,
  container,
  idPrefix,
}: ScopePickerProps) {
  const generatedId = useId();
  const prefix = idPrefix ?? generatedId;
  const { optionsByScopeType, canTargetGlobal, isLoading } = useScopeOptions();

  const availableScopeTypes: ScopeType[] = (
    allowedScopeTypes ?? (["global", "school", "department", "module"] as const).slice()
  ).filter((scopeType) => scopeType !== "global" || canTargetGlobal);

  const scopeType = value?.scopeType ?? null;
  const options = scopeType && scopeType !== "global" ? optionsByScopeType[scopeType] : [];
  const hasUnnamedOption = options.some((option) => option.isUnnamed);

  function handleScopeTypeChange(next: string) {
    // Changing the type always clears the id — a school id is meaningless as a
    // department id, and the backend 422s on a mismatch rather than ignoring it.
    onChange({ scopeType: next as ScopeType, scopeId: null });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-scope-type`}>Level</Label>
        <Select
          value={scopeType ?? undefined}
          onValueChange={handleScopeTypeChange}
          disabled={disabled}
        >
          <SelectTrigger id={`${prefix}-scope-type`}>
            <SelectValue placeholder="Pick a level" />
          </SelectTrigger>
          <SelectContent container={container}>
            {availableScopeTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {SCOPE_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {scopeType && (
          <p className="text-xs text-muted-foreground">{SCOPE_TYPE_HINTS[scopeType]}</p>
        )}
      </div>

      {scopeType && scopeType !== "global" && (
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-scope-id`}>{SCOPE_TYPE_LABELS[scopeType]}</Label>
          <Select
            value={value?.scopeId ?? undefined}
            onValueChange={(scopeId) => onChange({ scopeType, scopeId })}
            disabled={disabled || options.length === 0}
          >
            <SelectTrigger id={`${prefix}-scope-id`}>
              <SelectValue
                placeholder={
                  isLoading
                    ? "Loading…"
                    : options.length === 0
                      ? `No ${SCOPE_TYPE_LABELS[scopeType].toLowerCase()} available to you`
                      : `Pick a ${SCOPE_TYPE_LABELS[scopeType].toLowerCase()}`
                }
              />
            </SelectTrigger>
            <SelectContent container={container}>
              {options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!isLoading && options.length === 0 && (
            <p className="text-xs text-muted-foreground">
              You don't administer any {SCOPE_TYPE_LABELS[scopeType].toLowerCase()}, so
              there's nothing to delegate at this level.
            </p>
          )}
          {hasUnnamedOption && (
            <p className="text-xs text-muted-foreground">
              Your own {SCOPE_TYPE_LABELS[scopeType].toLowerCase()} is shown without its
              name — your account can't read the full{" "}
              {SCOPE_TYPE_LABELS[scopeType].toLowerCase()} list.
            </p>
          )}
        </div>
      )}

      {error && (
        <Callout variant="error" title="Check the level">
          {error}
        </Callout>
      )}
    </div>
  );
}
