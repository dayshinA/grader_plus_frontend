import { useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { FormError } from "~/components/ui/form-error";
import { FormField } from "~/components/ui/form-field";
import { SelectField } from "~/components/ui/select-field";
import { SubmitButton } from "~/components/ui/submit-button";
import { useCreateUnit, useUpdateUnit } from "~/features/structure/api/use-structure";
import {
  ACADEMIC_UNIT_KIND_LABELS,
  ACADEMIC_UNIT_KINDS,
  type AcademicUnit,
  type AcademicUnitKind,
  type AcademicUnitLevel,
} from "~/features/structure/types";
import { isApiError } from "~/lib/api-client";

const LEVEL_OPTIONS = [
  { value: "school", label: "School" },
  { value: "constituent_unit", label: "Constituent unit" },
];

const KIND_OPTIONS = ACADEMIC_UNIT_KINDS.map((kind) => ({
  value: kind,
  label: ACADEMIC_UNIT_KIND_LABELS[kind],
}));

// Two levels and no deeper, so the parent list holds schools only. The server refuses a third.
export function UnitFormDialog({
  open,
  onOpenChange,
  unit,
  schools,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing. Absent when creating. */
  unit?: AcademicUnit;
  schools: AcademicUnit[];
}) {
  const create = useCreateUnit();
  const update = useUpdateUnit();
  const editing = Boolean(unit);

  const [name, setName] = useState(unit?.name ?? "");
  const [code, setCode] = useState(unit?.code ?? "");
  const [level, setLevel] = useState<AcademicUnitLevel>(unit?.level ?? "school");
  const [unitKind, setUnitKind] = useState<AcademicUnitKind>(unit?.unitKind ?? "school");
  const [parentUnitId, setParentUnitId] = useState(unit?.parentUnitId ?? "");

  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;
  const fieldError = (field: string) =>
    isApiError(error) ? error.fieldError(field) : undefined;

  // A school cannot be its own parent, and a school with children cannot be demoted.
  const parentOptions = schools
    .filter((school) => school.id !== unit?.id)
    .map((school) => ({ value: school.id, label: school.name }));

  const needsParent = level === "constituent_unit";
  const canSubmit = name.trim().length >= 2 && (!needsParent || parentUnitId.length > 0);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    const done = (message: string) => {
      toast.success(message || (editing ? "Unit updated." : "Unit created."));
      onOpenChange(false);
    };

    if (unit) {
      update.mutate(
        {
          id: unit.id,
          payload: {
            name: name.trim(),
            code: code.trim() || undefined,
            level,
            unitKind,
            parentUnitId: needsParent ? parentUnitId : null,
          },
        },
        { onSuccess: ({ message }) => done(message) },
      );
    } else {
      create.mutate(
        {
          name: name.trim(),
          code: code.trim() || undefined,
          level,
          unitKind,
          parentUnitId: needsParent ? parentUnitId : undefined,
        },
        { onSuccess: ({ message }) => done(message) },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit academic unit" : "New academic unit"}</DialogTitle>
          <DialogDescription>
            A School sits at the top. Everything else hangs off exactly one School, and there
            is no third level.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <FormError error={error} />

          <FormField
            label="Name"
            name="name"
            required
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={fieldError("name")}
          />

          <FormField
            label="Governance code"
            name="code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            hint="Published for Schools, often absent for constituent units."
            error={fieldError("code")}
          />

          <SelectField
            label="Level"
            value={level}
            onValueChange={(value) => {
              setLevel(value as AcademicUnitLevel);
              if (value === "school") setParentUnitId("");
            }}
            options={LEVEL_OPTIONS}
            error={fieldError("level")}
          />

          {needsParent && (
            <SelectField
              label="Parent School"
              value={parentUnitId}
              onValueChange={setParentUnitId}
              options={parentOptions}
              placeholder="Choose a School"
              emptyText="No Schools exist yet. Create one first."
              error={fieldError("parentUnitId")}
            />
          )}

          <SelectField
            label="Kind"
            value={unitKind}
            onValueChange={(value) => setUnitKind(value as AcademicUnitKind)}
            options={KIND_OPTIONS}
            hint="A label for people reading the list. It does not change what anybody can do."
            error={fieldError("unitKind")}
          />

          {editing && unit?.isActive === false && (
            <Callout variant="warning" title={`${unit?.name ?? "This unit"} is deactivated`}>
              Its academic history stays in the data. Reactivating it here puts it back in the
              pickers.
            </Callout>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 cursor-pointer sm:h-9"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <SubmitButton
              isPending={pending}
              pendingLabel={editing ? "Saving" : "Creating"}
              disabled={!canSubmit}
              className="sm:w-auto"
            >
              {editing ? "Save changes" : "Create unit"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
