import { useState } from "react";
import { Highlighter, MessageSquarePlus, Trash2 } from "lucide-react";
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
import type { PdfTextSelection } from "~/components/ui/pdf-viewer";
import { Textarea } from "~/components/ui/textarea";
import { TextareaField } from "~/components/ui/textarea-field";
import {
  useCreateAnnotation,
  useDeleteAnnotation,
  useUpdateAnnotation,
} from "~/features/marking/api/use-marking";
import type { Annotation, CreateAnnotationPayload } from "~/features/marking/types";
import { pluralise } from "~/utils/format";

function round5(value: number): number {
  return Number(value.toFixed(5));
}

// The DTO caps the payload: 120 rects, 2000 characters of quote. Truncating here beats a
// 422 on a selection that was simply generous.
function selectionPayload(
  page: number,
  selection: PdfTextSelection,
  body: string,
): CreateAnnotationPayload {
  const rects = selection.rects.slice(0, 120).map((rect) => ({
    x: round5(rect.x),
    y: round5(rect.y),
    width: round5(rect.width),
    height: round5(rect.height),
  }));

  return {
    page,
    x: rects[0].x,
    y: rects[0].y,
    rects,
    quotedText: selection.text.slice(0, 2000),
    body,
  };
}

/**
 * The notes on the caller's own evaluation, pins and highlights alike. Two markers
 * annotating the same page never see each other's, because the note is keyed on the
 * evaluation and not on the submission alone.
 */
export function AnnotationPanel({
  submissionId,
  annotations,
  page,
  pendingPoint,
  pendingSelection,
  onPendingHandled,
  onFocusPin,
  readOnly,
}: {
  submissionId: string;
  annotations: Annotation[];
  page: number;
  /** Set when the marker clicked the page. Cleared once the note is saved or cancelled. */
  pendingPoint: { x: number; y: number } | null;
  /** Set when the marker selected text on the page. Same lifecycle as a pending pin. */
  pendingSelection: PdfTextSelection | null;
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
  const pending = pendingPoint ?? pendingSelection;

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
          {pending ? (
            <form
              className="space-y-2 rounded-lg border border-primary/40 bg-accent/40 p-3"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                if (body.trim().length === 0) return;
                const payload = pendingSelection
                  ? selectionPayload(page, pendingSelection, body.trim())
                  : {
                      page,
                      x: round5(pendingPoint?.x ?? 0),
                      y: round5(pendingPoint?.y ?? 0),
                      body: body.trim(),
                    };
                create.mutate(payload, {
                  onSuccess: () => {
                    setBody("");
                    onPendingHandled();
                  },
                });
              }}
            >
              <FormError error={create.error} />
              {pendingSelection ? (
                <blockquote className="border-l-2 border-primary/40 pl-2 text-xs text-muted-foreground">
                  <span className="line-clamp-2">{pendingSelection.text}</span>
                </blockquote>
              ) : (
                pendingPoint && (
                  <p className="text-xs text-muted-foreground">
                    Pinned at {Math.round(pendingPoint.x * 100)}%,{" "}
                    {Math.round(pendingPoint.y * 100)}% of page {page}.
                  </p>
                )
              )}
              <Textarea
                rows={3}
                autoFocus
                placeholder={
                  pendingSelection
                    ? "What you want to say about this passage"
                    : "What you want to say about this part"
                }
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
                  {create.isPending
                    ? "Saving"
                    : pendingSelection
                      ? "Add highlight"
                      : "Add note"}
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
              Click anywhere on the page to pin a note there, or select text to highlight
              it.
            </p>
          )}
        </>
      )}

      {onThisPage.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nothing on this page yet.</p>
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
                  {annotation.rects ? (
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
                    >
                      <Highlighter className="size-3" />
                    </span>
                  ) : (
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground"
                    >
                      {index + 1}
                    </span>
                  )}
                  <span className="min-w-0 text-sm">
                    {annotation.quotedText && (
                      <span className="mb-1 line-clamp-2 block text-xs text-muted-foreground">
                        "{annotation.quotedText}"
                      </span>
                    )}
                    {annotation.body}
                  </span>
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
              Only the text changes. The pin or highlight stays where you put it.
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
