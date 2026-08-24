import { SelectField } from "~/components/ui/select-field";
import type { AcademicUnit } from "~/features/structure/types";

// The value is owned by `useUnitScope`, which keeps it in the URL.
export function UnitScopePicker({
  value,
  onChange,
  ordered,
  label = "Academic unit",
}: {
  value: string;
  onChange: (unitId: string) => void;
  ordered: { unit: AcademicUnit; nested: boolean }[];
  label?: string;
}) {
  return (
    <SelectField
      label={label}
      value={value}
      onValueChange={onChange}
      className="w-full sm:max-w-sm"
      placeholder="Choose a unit"
      emptyText="No academic units are visible to your account."
      options={ordered.map(({ unit, nested }) => ({
        value: unit.id,
        label: nested ? `\u00a0\u00a0\u00a0${unit.name}` : unit.name,
      }))}
    />
  );
}
