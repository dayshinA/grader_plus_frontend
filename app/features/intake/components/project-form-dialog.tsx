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
import { useCreateProject, useUpdateProject } from "~/features/intake/api/use-intake";
import type { Project } from "~/features/intake/types";
import { isApiError } from "~/lib/api-client";

/**
 * Manual entry, for the folder the archive could not read and for a late addition. Editing
 * a project corrects the name shown on it only: the student record itself is untouched, so
 * a closed offering keeps saying what it said.
 */
export function ProjectFormDialog({
  open,
  onOpenChange,
  offeringId,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offeringId: string;
  project?: Project;
}) {
  const create = useCreateProject(offeringId);
  const update = useUpdateProject(offeringId);
  const editing = Boolean(project);

  const [learnId, setLearnId] = useState(project?.student?.learnId ?? "");
  const [studentName, setStudentName] = useState(project?.studentNameSnapshot ?? "");
  const [title, setTitle] = useState(project?.title ?? "");
  const [supervisorName, setSupervisorName] = useState(project?.supervisorName ?? "");

  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;
  const fieldError = (field: string) => (isApiError(error) ? error.fieldError(field) : undefined);

  const canSubmit =
    studentName.trim().length >= 2 &&
    title.trim().length >= 2 &&
    (editing || learnId.trim().length > 0);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    const done = (message: string) => {
      toast.success(message || (editing ? "Project updated." : "Project created."));
      onOpenChange(false);
    };

    if (project) {
      update.mutate(
        {
          projectId: project.id,
          payload: {
            title: title.trim(),
            studentName: studentName.trim(),
            supervisorName: supervisorName.trim() || null,
          },
        },
        { onSuccess: ({ message }) => done(message) },
      );
    } else {
      create.mutate(
        {
          learnId: learnId.trim(),
          studentName: studentName.trim(),
          title: title.trim(),
          supervisorName: supervisorName.trim() || undefined,
        },
        { onSuccess: ({ message }) => done(message) },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit project" : "Add a project by hand"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "This corrects what this project says. The student record behind it is left alone."
              : "For a folder the archive could not read, or a submission that arrived after it."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <FormError error={error} />

          {!editing && (
            <FormField
              label="Learn ID"
              name="learnId"
              required
              autoFocus
              value={learnId}
              onChange={(event) => setLearnId(event.target.value)}
              hint="Matches this person to their existing student record, if they have one."
              error={fieldError("learnId")}
            />
          )}

          <FormField
            label="Student name"
            name="studentName"
            required
            autoFocus={editing}
            value={studentName}
            onChange={(event) => setStudentName(event.target.value)}
            error={fieldError("studentName")}
          />

          <FormField
            label="Project title"
            name="title"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            error={fieldError("title")}
          />

          <FormField
            label="Supervisor"
            name="supervisorName"
            value={supervisorName}
            onChange={(event) => setSupervisorName(event.target.value)}
            hint="A name on the project. It grants nothing: a supervisor who marks gets an ordinary assignment."
            error={fieldError("supervisorName")}
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
              {editing ? "Save changes" : "Add project"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
