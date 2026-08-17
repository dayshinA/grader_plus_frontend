import { useMemo, useState } from "react";

import { Callout } from "~/components/ui/callout";
import { SelectField } from "~/components/ui/select-field";
import type { Role, ScopeType } from "~/features/access/types";
import { SCOPE_FOR_ROLE } from "~/features/access/types";
import {
  useModules,
  useOfferings,
  useUnits,
} from "~/features/structure/api/use-structure";

/**
 * A grant is a role and a scope, and the scope picker changes shape with the role: system
 * takes none, unit admin takes an academic unit, and coordinator and marker take a module
 * offering.
 *
 * The API has no "list every offering" route, so an offering is reached the way the
 * structure is actually shaped: unit, then module, then year.
 */
export function ScopePicker({
  role,
  scopeId,
  onScopeIdChange,
  error,
}: {
  role: Role;
  scopeId: string;
  onScopeIdChange: (scopeId: string) => void;
  error?: string;
}) {
  const scopeType: ScopeType = SCOPE_FOR_ROLE[role];

  const { data: units } = useUnits();
  const [unitId, setUnitId] = useState("");
  const [moduleId, setModuleId] = useState("");

  const { data: modules } = useModules(scopeType === "module_offering" ? unitId : undefined);
  const { data: offerings } = useOfferings(
    scopeType === "module_offering" ? moduleId : undefined,
  );

  const unitOptions = useMemo(() => {
    const rows = units ?? [];
    const schools = rows
      .filter((unit) => unit.level === "school")
      .sort((a, b) => a.name.localeCompare(b.name));
    const options: { value: string; label: string }[] = [];

    for (const school of schools) {
      options.push({ value: school.id, label: school.name });
      for (const child of rows
        .filter((unit) => unit.parentUnitId === school.id)
        .sort((a, b) => a.name.localeCompare(b.name))) {
        options.push({ value: child.id, label: `\u00a0\u00a0\u00a0${child.name}` });
      }
    }
    for (const unit of rows) {
      if (!options.some((option) => option.value === unit.id)) {
        options.push({ value: unit.id, label: unit.name });
      }
    }
    return options;
  }, [units]);

  if (scopeType === "system") {
    return (
      <Callout variant="warning" title="This role covers the whole platform">
        A System Administrator's role applies everywhere, so there is nothing to pick here.
        Their access to academic content is read only: no marking, no rubric writing, no
        student imports, no resolving a case and no export.
      </Callout>
    );
  }

  if (scopeType === "academic_unit") {
    return (
      <SelectField
        label="Academic unit"
        value={scopeId}
        onValueChange={onScopeIdChange}
        options={unitOptions}
        placeholder="Choose a unit"
        emptyText="No academic units are visible to your account."
        hint="A role given on a School also covers every unit inside it."
        error={error}
      />
    );
  }

  return (
    <div className="space-y-4">
      <SelectField
        label="Academic unit"
        value={unitId}
        onValueChange={(value) => {
          setUnitId(value);
          setModuleId("");
          onScopeIdChange("");
        }}
        options={unitOptions}
        placeholder="Choose a unit"
        emptyText="No academic units are visible to your account."
      />

      {unitId && (
        <SelectField
          label="Module"
          value={moduleId}
          onValueChange={(value) => {
            setModuleId(value);
            onScopeIdChange("");
          }}
          options={(modules ?? []).map((module) => ({
            value: module.id,
            label: `${module.code} · ${module.title}`,
          }))}
          placeholder="Choose a module"
          emptyText="This unit runs no modules yet."
        />
      )}

      {moduleId && (
        <SelectField
          label="Offering"
          value={scopeId}
          onValueChange={onScopeIdChange}
          options={(offerings ?? []).map((offering) => ({
            value: offering.id,
            label: `${offering.academicYear} · ${offering.status}`,
          }))}
          placeholder="Choose an academic year"
          emptyText="This module has no offerings yet."
          hint="Coordinator and marker are granted one academic year at a time."
          error={error}
        />
      )}
    </div>
  );
}
