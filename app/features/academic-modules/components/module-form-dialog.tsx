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
import { useCreateModule } from "~/features/academic-modules/api/use-create-module";
import { useUpdateModule } from "~/features/academic-modules/api/use-update-module";
import type { AcademicModuleResponse } from "~/features/academic-modules/types";
import { ApiError } from "~/lib/api-client";

export interface ModuleFormDialogOption {
  id: string;
  label: string;
}

interface ModuleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  viewer: "coordinator" | "super_admin";
  /** Required when mode is "edit" — the module being edited. */
  module?: AcademicModuleResponse;
  /**
   * Department picker options, both sourced from `GET /departments` (self-filtering by role
   * since the 2026-07-11 backend fix — see SYSTEM_DESIGN.md decision #33).
   * - `viewer="coordinator"`: only shown in create mode — only departments the coordinator
   *   already administers or holds a creation grant in (server-filtered, always active).
   * - `viewer="super_admin"`: every department, shown in both create and edit mode.
   */
  departmentOptions: ModuleFormDialogOption[];
  /** Super Admin viewer only — active coordinators, shown in both create and edit mode. */
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
  viewer,
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

  const showDepartmentField = viewer === "super_admin" || mode === "create";
  const showCoordinatorField = viewer === "super_admin";
  const hasDepartmentOptions = departmentOptions.length > 0;
  // A Coordinator with no admin/creation grant in any department has nowhere to create a
  // module yet — see SYSTEM_DESIGN.md decision #33.
  const blockedByNoDepartments =
    mode === "create" && viewer === "coordinator" && !hasDepartmentOptions;

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
          ...(viewer === "super_admin" ? { coordinatorId: form.coordinatorId } : {}),
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
        request: {
          ...base,
          ...(viewer === "super_admin"
            ? { departmentId: form.departmentId, coordinatorId: form.coordinatorId }
            : {}),
        },
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
          <DialogTitle>{mode === "create" ? "Add module" : "Edit module"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Set up a new academic module." : "Update this module's details."}
          </DialogDescription>
        </DialogHeader>

        {blockedByNoDepartments ? (
          <>
            <Alert
              variant="inline"
              status="info"
              timeout={0}
              title="No department access yet"
              message="You don't have creation rights in any department yet. Ask a Department Admin or Super Admin to grant you access to a department, then come back here."
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
                title={mode === "create" ? "Couldn't create module" : "Couldn't update module"}
                message={
                  error instanceof ApiError
                    ? error.message
                    : "Something went wrong. Please try again."
                }
              />
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="module-code">Code</Label>
                <Input
                  id="module-code"
                  required
                  value={form.code}
                  onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="module-name">Name</Label>
                <Input
                  id="module-name"
                  required
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="module-learn-id">Learn ID (optional)</Label>
                <Input
                  id="module-learn-id"
                  value={form.learnId}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, learnId: event.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="module-discrepancy-threshold">Discrepancy threshold</Label>
                  <Input
                    id="module-discrepancy-threshold"
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={form.discrepancyThreshold}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, discrepancyThreshold: event.target.value }))
                    }
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="module-marking-deadline">Marking deadline</Label>
                  <Input
                    id="module-marking-deadline"
                    type="date"
                    required
                    value={form.markingDeadline}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, markingDeadline: event.target.value }))
                    }
                  />
                </div>
              </div>

              {showDepartmentField && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="module-department">Department</Label>
                  <Select
                    value={form.departmentId}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, departmentId: value }))}
                  >
                    <SelectTrigger id="module-department">
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent container={dialogNode}>
                      {departmentOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {showCoordinatorField && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="module-coordinator">Coordinator</Label>
                  <Select
                    value={form.coordinatorId}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, coordinatorId: value }))
                    }
                  >
                    <SelectTrigger id="module-coordinator">
                      <SelectValue placeholder="Select a coordinator" />
                    </SelectTrigger>
                    <SelectContent container={dialogNode}>
                      {(coordinatorOptions ?? []).map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isPending ||
                    (showDepartmentField && !form.departmentId) ||
                    (showCoordinatorField && !form.coordinatorId)
                  }
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
