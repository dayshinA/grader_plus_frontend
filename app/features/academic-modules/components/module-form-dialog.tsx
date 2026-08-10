import { Building2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { FormError } from "~/components/ui/form-error";
import { FormField } from "~/components/ui/form-field";
import { SelectField } from "~/components/ui/select-field";
import { SubmitButton } from "~/components/ui/submit-button";
import { useCreateModule } from "~/features/academic-modules/api/use-create-module";
import { useUpdateModule } from "~/features/academic-modules/api/use-update-module";
import type { AcademicModuleResponse } from "~/features/academic-modules/types";
import { isApiError } from "~/lib/api-client";

export interface ModuleFormDialogOption {
  id: string;
  label: string;
}

interface ModuleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  /** Required when mode is "edit" — the module being edited. */
  module?: AcademicModuleResponse;
  /**
   * Department picker options, sourced from `GET /departments` (self-filtering by role since
   * the 2026-07-11 backend fix — see SYSTEM_DESIGN.md decision #33). A non-Super-Admin's list is
   * already server-filtered to departments they administer or hold a creation grant in.
   */
  departmentOptions: ModuleFormDialogOption[];
  /** Active coordinators (`GET /departments/:id/coordinators`), shown read-only on edit only —
   * nobody can reassign a module's coordinator through this form (see the read-only-fields
   * comment in the component body). */
  coordinatorOptions?: ModuleFormDialogOption[];
  /** Called after a successful create/update, once the dialog has closed —
   * `apiMessage` is the backend's own confirmation message (see decision #31). */
  onSuccess?: (
    mode: "create" | "edit",
    module: AcademicModuleResponse,
    apiMessage: string,
  ) => void;
}

function toDateInputValue(iso: string | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

const EMPTY_FORM = {
  code: "",
  name: "",
  learnId: "",
  discrepancyThreshold: "10",
  markingDeadline: "",
  departmentId: "",
  coordinatorId: "",
};

/**
 * Note: this component is remounted by its caller (via a `key` that changes every time the
 * dialog is opened) rather than resetting its own state in an effect — same convention as
 * `DepartmentFormDialog`/`UserFormDialog`.
 */
export function ModuleFormDialog({
  open,
  onOpenChange,
  mode,
  module,
  departmentOptions,
  coordinatorOptions,
  onSuccess,
}: ModuleFormDialogProps) {
  const [form, setForm] = useState(() =>
    mode === "edit" && module
      ? {
          code: module.code,
          name: module.name,
          learnId: module.learnId ?? "",
          discrepancyThreshold: String(module.discrepancyThreshold),
          markingDeadline: toDateInputValue(module.markingDeadline),
          departmentId: module.departmentId,
          coordinatorId: module.coordinatorId,
        }
      : { ...EMPTY_FORM, departmentId: departmentOptions[0]?.id ?? "" },
  );

  const createModule = useCreateModule();
  const updateModule = useUpdateModule();
  const mutation = mode === "create" ? createModule : updateModule;

  // Passed to the nested Selects below as their portal container — see
  // SelectContentProps.container's doc comment for why this is needed (Dialog's focus-trap vs.
  // a document.body-portaled Select popover).
  const [dialogNode, setDialogNode] = useState<HTMLDivElement | null>(null);

  // Reassigning a module's department or coordinator through this form is dead capability
  // as of the backend's 2026-08-03 least-privilege redesign: `resolveCoordinatorId`'s
  // explicit-coordinatorId branch only ever ran for a System Administrator caller, and System
  // Administrator no longer holds modules.create/modules.update at all — so nobody can reach
  // it any more. The department/coordinator fields are shown on edit purely as read-only
  // context (never editable, by anyone), and the coordinator field never appears on create
  // either — the backend always force-assigns the creator as coordinator.
  const showDepartmentField = true;
  const showCoordinatorField = mode === "edit";
  const departmentFieldDisabled = mode === "edit";
  const coordinatorFieldDisabled = true;
  const hasDepartmentOptions = departmentOptions.length > 0;
  // A Department Admin/Coordinator with no admin/creation grant in any department has
  // nowhere to create a module yet — see SYSTEM_DESIGN.md decision #33. This dialog is only
  // ever opened in create mode by a viewer ModulesPage has already confirmed holds
  // modules.create, so there's no System-Administrator case to special-case here any more.
  const blockedByNoDepartments = mode === "create" && !hasDepartmentOptions;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const base = {
      code: form.code,
      name: form.name,
      learnId: form.learnId.trim() ? form.learnId.trim() : null,
      discrepancyThreshold: Number(form.discrepancyThreshold),
      markingDeadline: form.markingDeadline,
    };

    if (mode === "create") {
      createModule.mutate(
        {
          ...base,
          departmentId: form.departmentId,
          // coordinatorId is never sent — the backend always force-assigns the creator as
          // coordinator, for every caller who can reach create at all.
        },
        {
          onSuccess: ({ data: created, message }) => {
            onOpenChange(false);
            onSuccess?.("create", created, message);
          },
        },
      );
      return;
    }

    if (!module) return;
    updateModule.mutate(
      {
        id: module.id,
        // departmentId/coordinatorId are never sent on update — nobody can reassign either
        // through this form any more (see the read-only-fields comment above).
        request: { ...base },
      },
      {
        onSuccess: ({ data: updated, message }) => {
          onOpenChange(false);
          onSuccess?.("edit", updated, message);
        },
      },
    );
  }

  const error = mutation.error;
  const isPending = mutation.isPending;
  const fieldError = (name: string) => (isApiError(error) ? error.fieldError(name) : undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={setDialogNode}>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add module" : "Edit module"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Set up a new academic module." : "Update this module's details."}
          </DialogDescription>
        </DialogHeader>

        {blockedByNoDepartments ? (
          <>
            <Empty className="px-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Building2 aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No department access yet</EmptyTitle>
                <EmptyDescription>
                  You don't have creation rights in any department yet. Ask a Department Admin,
                  School Admin, or System Administrator to grant you access to a department, then
                  come back here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 cursor-pointer sm:h-9"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <FormError error={error} />

            <FormField
              label="Code"
              id="module-code"
              name="code"
              required
              autoFocus
              hint="As it appears in Learn, e.g. COP511."
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
              error={fieldError("code")}
            />

            <FormField
              label="Name"
              id="module-name"
              name="name"
              required
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              error={fieldError("name")}
            />

            <FormField
              label="Learn ID"
              id="module-learn-id"
              name="learnId"
              hint="Optional. Used to match this module up with Learn on export."
              value={form.learnId}
              onChange={(event) => setForm((prev) => ({ ...prev, learnId: event.target.value }))}
              error={fieldError("learnId")}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Discrepancy threshold"
                id="module-discrepancy-threshold"
                name="discrepancyThreshold"
                type="number"
                min={1}
                max={100}
                required
                hint="Marks apart before a project is flagged."
                value={form.discrepancyThreshold}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, discrepancyThreshold: event.target.value }))
                }
                error={fieldError("discrepancyThreshold")}
              />

              <FormField
                label="Marking deadline"
                id="module-marking-deadline"
                name="markingDeadline"
                type="date"
                required
                value={form.markingDeadline}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, markingDeadline: event.target.value }))
                }
                error={fieldError("markingDeadline")}
              />
            </div>

            {showDepartmentField && (
              <SelectField
                label="Department"
                id="module-department"
                value={form.departmentId}
                onValueChange={(value) => setForm((prev) => ({ ...prev, departmentId: value }))}
                options={departmentOptions.map((option) => ({
                  value: option.id,
                  label: option.label,
                }))}
                placeholder="Select a department"
                disabled={departmentFieldDisabled}
                container={dialogNode}
                hint={
                  departmentFieldDisabled
                    ? "A module's department can't be changed after it's created."
                    : undefined
                }
                error={fieldError("departmentId")}
              />
            )}

            {showCoordinatorField && (
              <SelectField
                label="Coordinator"
                id="module-coordinator"
                value={form.coordinatorId}
                onValueChange={(value) => setForm((prev) => ({ ...prev, coordinatorId: value }))}
                options={(coordinatorOptions ?? []).map((option) => ({
                  value: option.id,
                  label: option.label,
                }))}
                placeholder="Select a coordinator"
                disabled={coordinatorFieldDisabled}
                container={dialogNode}
                hint="A module's coordinator can't be reassigned here."
              />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 cursor-pointer sm:h-9"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <SubmitButton
                isPending={isPending}
                pendingLabel="Saving…"
                disabled={
                  (showDepartmentField && !form.departmentId) ||
                  (showCoordinatorField && !form.coordinatorId)
                }
                className="sm:w-auto"
              >
                {mode === "create" ? "Create module" : "Save changes"}
              </SubmitButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
