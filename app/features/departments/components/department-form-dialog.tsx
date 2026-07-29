import { useState, type FormEvent } from "react";
import { Alert } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useCreateDepartment } from "~/features/departments/api/use-create-department";
import { useUpdateDepartment } from "~/features/departments/api/use-update-department";
import type { DepartmentResponse } from "~/features/departments/types";
import { ApiError } from "~/lib/api-client";

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
   * `SchoolAdminDepartmentsPanel` (`coordinator/school-settings.tsx`) restricts this to only the
   * schools the caller administers.
   */
  schoolOptions: DepartmentFormDialogSchoolOption[];
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
  onSuccess,
}: DepartmentFormDialogProps) {
  const [form, setForm] = useState(() =>
    mode === "edit" && department
      ? { code: department.code, name: department.name, schoolId: department.schoolId }
      : { ...EMPTY_FORM, schoolId: schoolOptions[0]?.id ?? "" },
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
            <Alert
              variant="inline"
              status="info"
              timeout={0}
              title="No school access yet"
              message="You don't administer any school yet. Ask a Super Admin to grant you School Admin access, then come back here."
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {error && (
              <Alert
                variant="inline"
                status="error"
                timeout={0}
                title={
                  mode === "create" ? "Couldn't create department" : "Couldn't update department"
                }
                message={
                  error instanceof ApiError
                    ? error.message
                    : "Something went wrong. Please try again."
                }
              />
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="department-code">Code</Label>
                <Input
                  id="department-code"
                  required
                  value={form.code}
                  onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="department-name">Name</Label>
                <Input
                  id="department-name"
                  required
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="department-school">School</Label>
                <Select
                  value={form.schoolId}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, schoolId: value }))}
                >
                  <SelectTrigger id="department-school">
                    <SelectValue placeholder="Select a school" />
                  </SelectTrigger>
                  <SelectContent container={dialogNode}>
                    {schoolOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || !form.schoolId}
                  data-loading={isPending}
                >
                  {isPending ? "Saving..." : mode === "create" ? "Create" : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
