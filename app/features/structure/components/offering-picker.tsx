import { useMemo, useState } from "react";

import { SelectField } from "~/components/ui/select-field";
import { useModules, useOfferings, useUnits } from "~/features/structure/api/use-structure";

// Unit, then module, then year: no route lists every offering, because that is a scope question.
export function OfferingPicker({
  value,
  onChange,
  excludeOfferingId,
  label = "Offering",
  hint,
  error,
}: {
  value: string;
  onChange: (offeringId: string) => void;
  /** Usually the offering being worked on, since copying from itself is refused. */
  excludeOfferingId?: string;
  label?: string;
  hint?: string;
  error?: string;
}) {
  const { data: units } = useUnits();
  const [unitId, setUnitId] = useState("");
  const [moduleId, setModuleId] = useState("");

  const { data: modules } = useModules(unitId || undefined);
  const { data: offerings } = useOfferings(moduleId || undefined);

  const unitName = units?.find((unit) => unit.id === unitId)?.name ?? "This unit";
  const moduleCode = modules?.find((module) => module.id === moduleId)?.code ?? "This module";

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

  return (
    <div className="space-y-4">
      <SelectField
        label="Academic unit"
        value={unitId}
        onValueChange={(next) => {
          setUnitId(next);
          setModuleId("");
          onChange("");
        }}
        options={unitOptions}
        placeholder="Choose a unit"
        emptyText="No academic units are visible to your account."
      />

      {unitId && (
        <SelectField
          label="Module"
          value={moduleId}
          onValueChange={(next) => {
            setModuleId(next);
            onChange("");
          }}
          options={(modules ?? []).map((module) => ({
            value: module.id,
            label: `${module.code} · ${module.title}`,
          }))}
          placeholder="Choose a module"
          emptyText={`${unitName} runs no modules you can see.`}
        />
      )}

      {moduleId && (
        <SelectField
          label={label}
          value={value}
          onValueChange={onChange}
          options={(offerings ?? [])
            .filter((offering) => offering.id !== excludeOfferingId)
            .map((offering) => ({
              value: offering.id,
              label: `${offering.academicYear} · ${offering.status}`,
            }))}
          placeholder="Choose an academic year"
          emptyText={`${moduleCode} has no other offerings you can see.`}
          hint={hint}
          error={error}
        />
      )}
    </div>
  );
}
