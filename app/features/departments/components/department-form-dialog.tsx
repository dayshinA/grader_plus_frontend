import { Landmark } from "lucide-react";
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
import { useCreateDepartment } from "~/features/departments/api/use-create-department";
import { useUpdateDepartment } from "~/features/departments/api/use-update-department";
import type { DepartmentResponse } from "~/features/departments/types";
import { isApiError } from "~/lib/api-client";

export interface DepartmentFormDialogSchoolOption {
  id: string;
  label: string;
}

interface DepartmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  /** Required when mode is "edit" — the department being edited. */
  department?: DepartmentResponse;
  /**
   * School picker options — added 2026-07-29 (FR41/43), mirrors `ModuleFormDialog`'s
   * `departmentOptions` prop one level up. Sourced from `GET /schools` by the caller: the Super
   * Admin `DepartmentsPage` passes every school; the Coordinator/School-Admin
   * `SchoolAdminDepartmentsPanel` (`workspace/school-settings.tsx`) restricts this to only the
   * schools the caller administers.
   */
  schoolOptions: DepartmentFormDialogSchoolOption[];
  /**
   * Pre-selects the school field on create — the school already picked on `DepartmentsPage`'s
   * own school-first picker (2026-08-05). Falls back to the first option when unset, same as
   * before. Ignored in edit mode.
   */
  defaultSchoolId?: string;
  /** Called after a successful create/update, once the dialog has closed —
   * `apiMessage` is the backend's own confirmation message (see decision #31). */
  onSuccess?: (
    mode: "create" | "edit",
    department: DepartmentResponse,
    apiMessage: string,
  ) => void;
}

const EMPTY_FORM = { code: "", name: "", schoolId: "" };

/**
 * Note: this component is remounted by its caller (via a `key` that changes
 * every time the dialog is opened) rather than resetting its own state in an
 * effect — see `departments-page.tsx`'s `formDialogNonce`, same pattern as
 * `UserFormDialog`.
 */
export function DepartmentFormDialog({
  open,
  onOpenChange,
  mode,
  department,
  schoolOptions,
  defaultSchoolId,
  onSuccess,
}: DepartmentFormDialogProps) {
  const [form, setForm] = useState(() =>
    mode === "edit" && department
      ? { code: department.code, name: department.name, schoolId: department.schoolId }
      : { ...EMPTY_FORM, schoolId: defaultSchoolId ?? schoolOptions[0]?.id ?? "" },
  );
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const mutation = mode === "create" ? createDepartment : updateDepartment;

  // Passed to the nested Select below as its portal container — see
  // SelectContentProps.container's doc comment for why this is needed (Dialog's focus-trap vs.
  // a document.body-portaled Select popover).
  const [dialogNode, setDialogNode] = useState<HTMLDivElement | null>(null);

  const hasSchoolOptions = schoolOptions.length > 0;
  // A Coordinator with no School Admin grant anywhere has nowhere to create a department yet —
  // mirrors ModuleFormDialog's `blockedByNoDepartments` one level up (decision #33).
  const blockedByNoSchools = mode === "create" && !hasSchoolOptions;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mode === "create") {
      createDepartment.mutate(
        { code: form.code, name: form.name, schoolId: form.schoolId },
        {
          onSuccess: ({ data: created, message }) => {
            onOpenChange(false);
            onSuccess?.("create", created, message);
          },
        },
      );
      return;
    }

    if (!department) return;
    updateDepartment.mutate(
      {
        id: department.id,
        request: { code: form.code, name: form.name, schoolId: form.schoolId },
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
          <DialogTitle>{mode === "create" ? "Add department" : "Edit department"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Departments group modules and their administering Coordinators — at least one must exist before any module can be created."
              : "Update this department's code, name, or school."}
          </DialogDescription>
        </DialogHeader>

        {blockedByNoSchools ? (
          <>
            <Empty className="px-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Landmark aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No school access yet</EmptyTitle>
                <EmptyDescription>
                  You don't administer any school yet. Ask a System Administrator to grant you
                  School Admin access, then come back here.
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
              id="department-code"
              name="code"
              required
              autoFocus
              hint="Short identifier, e.g. CO."
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
              error={fieldError("code")}
            />

            <FormField
              label="Name"
              id="department-name"
              name="name"
              required
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              error={fieldError("name")}
            />

            <SelectField
              label="School"
              id="department-school"
              value={form.schoolId}
              onValueChange={(value) => setForm((prev) => ({ ...prev, schoolId: value }))}
              options={schoolOptions.map((option) => ({ value: option.id, label: option.label }))}
              placeholder="Select a school"
              container={dialogNode}
              error={fieldError("schoolId")}
            />

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
                disabled={!form.schoolId}
                className="sm:w-auto"
              >
                {mode === "create" ? "Create department" : "Save changes"}
              </SubmitButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
