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
import { useCreateDepartment } from "~/features/departments/api/use-create-department";
import { useUpdateDepartment } from "~/features/departments/api/use-update-department";
import type { DepartmentResponse } from "~/features/departments/types";
import { ApiError } from "~/lib/api-client";

interface DepartmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  /** Required when mode is "edit" — the department being edited. */
  department?: DepartmentResponse;
  /** Called after a successful create/update, once the dialog has closed —
   * `apiMessage` is the backend's own confirmation message (see decision #31). */
  onSuccess?: (
    mode: "create" | "edit",
    department: DepartmentResponse,
    apiMessage: string,
  ) => void;
}

const EMPTY_FORM = { code: "", name: "" };

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
  onSuccess,
}: DepartmentFormDialogProps) {
  const [form, setForm] = useState(() =>
    mode === "edit" && department
      ? { code: department.code, name: department.name }
      : EMPTY_FORM,
  );
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const mutation = mode === "create" ? createDepartment : updateDepartment;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mode === "create") {
      createDepartment.mutate(
        { code: form.code, name: form.name },
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
      { id: department.id, request: { code: form.code, name: form.name } },
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add department" : "Edit department"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Departments group modules and their administering Coordinators — at least one must exist before any module can be created."
              : "Update this department's code or name."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert
            variant="inline"
            status="error"
            timeout={0}
            title={mode === "create" ? "Couldn't create department" : "Couldn't update department"}
            message={
              error instanceof ApiError ? error.message : "Something went wrong. Please try again."
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} data-loading={isPending}>
              {isPending ? "Saving..." : mode === "create" ? "Create" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
