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
import { SelectField } from "~/components/ui/select-field";
import { SubmitButton } from "~/components/ui/submit-button";
import {
  useCreateProgramme,
  useUpdateProgramme,
} from "~/features/structure/api/use-structure";
import {
  PROGRAMME_LEVEL_LABELS,
  PROGRAMME_LEVELS,
  type Programme,
  type ProgrammeLevel,
} from "~/features/structure/types";
import { isApiError } from "~/lib/api-client";

const LEVEL_OPTIONS = PROGRAMME_LEVELS.map((level) => ({
  value: level,
  label: PROGRAMME_LEVEL_LABELS[level],
}));

export function ProgrammeFormDialog({
  open,
  onOpenChange,
  unitId,
  programme,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string;
  programme?: Programme;
}) {
  const create = useCreateProgramme(unitId);
  const update = useUpdateProgramme(unitId);
  const editing = Boolean(programme);

  const [code, setCode] = useState(programme?.code ?? "");
  const [title, setTitle] = useState(programme?.title ?? "");
  const [level, setLevel] = useState<ProgrammeLevel>(programme?.level ?? "undergraduate");

  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;
  const fieldError = (field: string) => (isApiError(error) ? error.fieldError(field) : undefined);

  const canSubmit = code.trim().length >= 2 && title.trim().length >= 2;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    const payload = { code: code.trim(), title: title.trim(), level };
    const done = (message: string) => {
      toast.success(message || (editing ? "Programme updated." : "Programme created."));
      onOpenChange(false);
    };

    if (programme) {
      update.mutate(
        { id: programme.id, payload },
        { onSuccess: ({ message }) => done(message) },
      );
    } else {
      create.mutate(payload, { onSuccess: ({ message }) => done(message) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit programme" : "New programme"}</DialogTitle>
          <DialogDescription>
            A programme belongs to one unit. Modules are linked to it separately, from the
            module side.
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

          <SelectField
            label="Level"
            value={level}
            onValueChange={(value) => setLevel(value as ProgrammeLevel)}
            options={LEVEL_OPTIONS}
            error={fieldError("level")}
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
              {editing ? "Save changes" : "Create programme"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
