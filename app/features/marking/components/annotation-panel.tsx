import { useState } from "react";
import { MessageSquarePlus, Trash2 } from "lucide-react";
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
import { Textarea } from "~/components/ui/textarea";
import { TextareaField } from "~/components/ui/textarea-field";
import {
  useCreateAnnotation,
  useDeleteAnnotation,
  useUpdateAnnotation,
} from "~/features/marking/api/use-marking";
import type { Annotation } from "~/features/marking/types";
import { pluralise } from "~/utils/format";

/**
 * The pins on the caller's own evaluation. Two markers annotating the same page never see
 * each other's, because the pin is keyed on the evaluation and not on the submission alone.
 */
export function AnnotationPanel({
  submissionId,
  annotations,
  page,
  pendingPoint,
  onPendingHandled,
  onFocusPin,
  readOnly,
}: {
  submissionId: string;
  annotations: Annotation[];
  page: number;
  /** Set when the marker clicked the page. Cleared once the note is saved or cancelled. */
  pendingPoint: { x: number; y: number } | null;
  onPendingHandled: () => void;
  onFocusPin: (annotation: Annotation) => void;
  readOnly: boolean;
}) {
  const create = useCreateAnnotation(submissionId);
  const update = useUpdateAnnotation(submissionId);
  const remove = useDeleteAnnotation(submissionId);

  const [body, setBody] = useState("");
  const [editing, setEditing] = useState<Annotation | undefined>();
  const [editBody, setEditBody] = useState("");

  const onThisPage = annotations.filter((annotation) => annotation.page === page);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">Your notes</p>
        <p className="text-xs text-muted-foreground">
          {pluralise(onThisPage.length, "note")} on page {page}
        </p>
      </div>

      {!readOnly && (
        <>
          {pendingPoint ? (
            <form
              className="space-y-2 rounded-lg border border-primary/40 bg-accent/40 p-3"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                if (body.trim().length === 0) return;
                create.mutate(
                  {
                    page,
                    x: Number(pendingPoint.x.toFixed(5)),
                    y: Number(pendingPoint.y.toFixed(5)),
                    body: body.trim(),
                  },
                  {
                    onSuccess: () => {
                      setBody("");
                      onPendingHandled();
                    },
                  },
                );
              }}
            >
              <FormError error={create.error} />
              <p className="text-xs text-muted-foreground">
                Pinned at {Math.round(pendingPoint.x * 100)}%,{" "}
                {Math.round(pendingPoint.y * 100)}% of page {page}.
              </p>
              <Textarea
                rows={3}
                autoFocus
                placeholder="What you want to say about this part"
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  className="h-9 cursor-pointer"
                  disabled={body.trim().length === 0 || create.isPending}
                >
                  {create.isPending ? "Saving" : "Add note"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-9 cursor-pointer"
                  onClick={() => {
                    setBody("");
                    onPendingHandled();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <p className="flex items-start gap-2 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              <MessageSquarePlus className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Click anywhere on the page to pin a note there.
            </p>
          )}
        </>
      )}

      {onThisPage.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nothing pinned on this page yet.</p>
      ) : (
        <ul className="space-y-2">
          {onThisPage.map((annotation, index) => (
            <li key={annotation.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 text-left"
                  onClick={() => onFocusPin(annotation)}
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground"
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 text-sm">{annotation.body}</span>
                </button>

                {!readOnly && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 cursor-pointer"
                      onClick={() => {
                        setEditing(annotation);
                        setEditBody(annotation.body);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 cursor-pointer text-destructive hover:text-destructive"
                      disabled={remove.isPending}
                      onClick={() =>
                        remove.mutate(annotation.id, {
                          onSuccess: () => toast.success("Note removed."),
                        })
                      }
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      <span className="sr-only">Remove note {index + 1}</span>
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(undefined)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit note</DialogTitle>
            <DialogDescription>
              Only the text changes. The pin stays where you put it.
            </DialogDescription>
          </DialogHeader>

          <FormError error={update.error} />

          <TextareaField
            label="Note"
            name="body"
            rows={4}
            autoFocus
            value={editBody}
            onChange={(event) => setEditBody(event.target.value)}
          />

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 cursor-pointer sm:h-9"
              onClick={() => setEditing(undefined)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-11 cursor-pointer sm:h-9"
              disabled={editBody.trim().length === 0 || update.isPending}
              onClick={() => {
                if (!editing) return;
                update.mutate(
                  { annotationId: editing.id, payload: { body: editBody.trim() } },
                  { onSuccess: () => setEditing(undefined) },
                );
              }}
            >
              {update.isPending ? "Saving" : "Save note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
