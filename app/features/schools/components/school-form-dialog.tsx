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
import { FormError } from "~/components/ui/form-error";
import { FormField } from "~/components/ui/form-field";
import { SubmitButton } from "~/components/ui/submit-button";
import { useCreateSchool } from "~/features/schools/api/use-create-school";
import { useUpdateSchool } from "~/features/schools/api/use-update-school";
import type { SchoolResponse } from "~/features/schools/types";
import { isApiError } from "~/lib/api-client";

interface SchoolFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  /** Required when mode is "edit" — the school being edited. */
  school?: SchoolResponse;
  /** Called after a successful create/update, once the dialog has closed —
   * `apiMessage` is the backend's own confirmation message (see decision #31). */
  onSuccess?: (mode: "create" | "edit", school: SchoolResponse, apiMessage: string) => void;
}

const EMPTY_FORM = { code: "", name: "" };

/**
 * Note: this component is remounted by its caller (via a `key` that changes
 * every time the dialog is opened) rather than resetting its own state in an
 * effect — same convention as `DepartmentFormDialog` (decision #37).
 */
export function SchoolFormDialog({
  open,
  onOpenChange,
  mode,
  school,
  onSuccess,
}: SchoolFormDialogProps) {
  const [form, setForm] = useState(() =>
    mode === "edit" && school ? { code: school.code, name: school.name } : EMPTY_FORM,
  );
  const createSchool = useCreateSchool();
  const updateSchool = useUpdateSchool();
  const mutation = mode === "create" ? createSchool : updateSchool;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mode === "create") {
      createSchool.mutate(
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

    if (!school) return;
    updateSchool.mutate(
      { id: school.id, request: { code: form.code, name: form.name } },
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add school" : "Edit school"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Schools group departments and their administering Coordinators — at least one must exist before any department can be created."
              : "Update this school's code or name."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <FormError error={error} />

          <FormField
            label="Code"
            id="school-code"
            name="code"
            required
            autoFocus
            hint="Short identifier, e.g. SCI."
            value={form.code}
            onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
            error={fieldError("code")}
          />

          <FormField
            label="Name"
            id="school-name"
            name="name"
            required
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            error={fieldError("name")}
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
              className="sm:w-auto"
            >
              {mode === "create" ? "Create school" : "Save changes"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
