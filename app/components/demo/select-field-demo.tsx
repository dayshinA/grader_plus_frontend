import { useState } from "react";

import { SelectField } from "~/components/ui/select-field";

const MODULES = [
  { value: "cop511", label: "COP511 — Advanced Software Engineering" },
  { value: "cop520", label: "COP520 — Research Methods" },
  { value: "cop530", label: "COP530 — Individual Project" },
];

/** The choice counterpart to FormField: same label/message/validation wiring, a Select instead. */
export function SelectFieldDemo() {
  const [module, setModule] = useState("cop511");
  const [department, setDepartment] = useState("");

  return (
    <div className="max-w-sm space-y-6">
      <SelectField
        label="Module"
        value={module}
        onValueChange={setModule}
        options={MODULES}
        hint="Everything on the dashboard is scoped to this module."
      />

      <SelectField
        label="Department"
        value={department}
        onValueChange={setDepartment}
        options={[]}
        placeholder="Select a department"
        emptyText="You don't administer any department yet."
        error="Pick a department before continuing."
      />
    </div>
  );
}
