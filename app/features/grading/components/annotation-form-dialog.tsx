import { useState } from "react";

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
import { TextareaField } from "~/components/ui/textarea-field";
import type { PdfPoint } from "~/components/ui/pdf-viewer";
import type { AnnotationResponse } from "~/features/grading/types";

const MAX_CONTENT = 5000;
const MAX_HIGHLIGHT = 1000;

/**
 * Writes one annotation — a new pin dropped on the page, a new comment placed by hand, or an edit
 * to an existing one.
 *
 * Which of the three it is comes from the props rather than a mode flag: `annotation` means edit,
 * `point` means a pin was dropped, neither means the keyboard path where the marker types a page
 * number instead of clicking. That last one exists because a click target is not reachable without
 * a pointer, and dropping a pin is otherwise the only way to comment at all.
 *
 * **Position is not editable on an edit.** The backend has no reposition route by design, so
 * offering the fields would promise something it can't do — moving a pin means deleting it and
 * dropping another, which the list offers.
 */
export function AnnotationFormDialog({
  open,
  onOpenChange,
  annotation,
  point,
  pageNumber,
  pageCount,
  isPending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing. */
  annotation?: AnnotationResponse;
  /** Present when the marker clicked the page. Absent on the keyboard path. */
  point?: PdfPoint;
  /** The page currently on screen — the default for the keyboard path. */
  pageNumber: number;
  pageCount: number;
  isPending: boolean;
  error: unknown;
  onSubmit: (values: {
    content: string;
    highlightText?: string;
    pageNumber: number;
    posX: number;
    posY: number;
  }) => void;
}) {
  const isEdit = Boolean(annotation);
  const [content, setContent] = useState(annotation?.content ?? "");
  const [highlightText, setHighlightText] = useState(annotation?.highlightText ?? "");
  const [page, setPage] = useState(String(annotation?.pageNumber ?? pageNumber));
  const [touched, setTouched] = useState(false);

  const trimmedContent = content.trim();
  const parsedPage = Number.parseInt(page, 10);
  const pageValid = Number.isInteger(parsedPage) && parsedPage >= 1 && parsedPage <= pageCount;
  const contentError =
    touched && trimmedContent === "" ? "Write a comment before saving." : undefined;
  const pageError =
    touched && !pageValid
      ? `Enter a page between 1 and ${pageCount}.`
      : undefined;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (trimmedContent === "" || (!isEdit && !pageValid)) return;

    onSubmit({
      content: trimmedContent,
      highlightText: highlightText.trim() === "" ? undefined : highlightText.trim(),
      pageNumber: isEdit ? annotation!.pageNumber : parsedPage,
      // Centre of the page when there was no click to take a position from. Arbitrary, but the
      // API requires a coordinate and the alternative is asking a keyboard user to type two
      // fractions, which is worse than a pin they can see and delete.
      posX: point?.x ?? annotation?.posX ?? 0.5,
      posY: point?.y ?? annotation?.posY ?? 0.5,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit comment" : "Add a comment"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Only the comment and the quoted text can change — a pin can't be moved, so delete and re-place it if it's in the wrong spot."
                : point
                  ? `Pinned to page ${pageNumber}. Only you can see it.`
                  : "Only you can see this. No other marker on this project sees your comments, or knows they exist."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!isEdit && !point && (
              <FormField
                label="Page"
                type="number"
                min={1}
                max={pageCount}
                value={page}
                onChange={(event) => setPage(event.target.value)}
                error={pageError}
                hint={`This document has ${pageCount} ${pageCount === 1 ? "page" : "pages"}.`}
              />
            )}

            <TextareaField
              label="Comment"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={5}
              maxLength={MAX_CONTENT}
              error={contentError}
              hint={`${trimmedContent.length}/${MAX_CONTENT}`}
            />

            <FormField
              label="Quoted text (optional)"
              value={highlightText}
              onChange={(event) => setHighlightText(event.target.value)}
              maxLength={MAX_HIGHLIGHT}
              hint="The passage this comment is about, if it helps you find it again later."
            />

            <FormError error={error} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <SubmitButton isPending={isPending} pendingLabel="Saving…">
              {isEdit ? "Save changes" : "Add comment"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
