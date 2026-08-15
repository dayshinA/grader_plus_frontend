import { useState } from "react";
import { toast } from "sonner";

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
import { useCreateModule, useUpdateModule } from "~/features/structure/api/use-structure";
import type { ProjectModule } from "~/features/structure/types";
import { isApiError } from "~/lib/api-client";

export function ModuleFormDialog({
  open,
  onOpenChange,
  unitId,
  module,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string;
  module?: ProjectModule;
}) {
  const create = useCreateModule(unitId);
  const update = useUpdateModule(unitId);
  const editing = Boolean(module);

  const [code, setCode] = useState(module?.code ?? "");
  const [title, setTitle] = useState(module?.title ?? "");

  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;
  const fieldError = (field: string) => (isApiError(error) ? error.fieldError(field) : undefined);

  const canSubmit = code.trim().length >= 2 && title.trim().length >= 2;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    const payload = { code: code.trim(), title: title.trim() };
    const done = (message: string) => {
      toast.success(message || (editing ? "Module updated." : "Module created."));
      onOpenChange(false);
    };

    if (module) {
      update.mutate({ id: module.id, payload }, { onSuccess: ({ message }) => done(message) });
    } else {
      create.mutate(payload, { onSuccess: ({ message }) => done(message) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit module" : "New module"}</DialogTitle>
          <DialogDescription>
            A module is permanent. Each academic year of it is an offering, created
            separately, so last year stays exactly as it was marked.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <FormError error={error} />

          <FormField
            label="Code"
            name="code"
            required
            autoFocus
            value={code}
            onChange={(event) => setCode(event.target.value)}
            error={fieldError("code")}
          />

          <FormField
            label="Title"
            name="title"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            error={fieldError("title")}
          />

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
              {editing ? "Save changes" : "Create module"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
