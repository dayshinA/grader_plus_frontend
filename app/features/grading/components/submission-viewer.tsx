import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  MessageSquarePlus,
  Minus,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { ErrorCard } from "~/components/ui/error-card";
import { PdfViewer, type PdfPoint } from "~/components/ui/pdf-viewer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import {
  useAnnotationMutations,
  useAnnotations,
} from "~/features/grading/api/use-annotations";
import { AnnotationFormDialog } from "~/features/grading/components/annotation-form-dialog";
import { AnnotationPins } from "~/features/grading/components/annotation-pins";
import type { AnnotationResponse } from "~/features/grading/types";
import {
  useResolveDownloadUrl,
  useStudentSubmissions,
} from "~/features/submissions/api/use-submissions";
import type { SubmissionListItem } from "~/features/submissions/types";
import { downloadUrlInNewTab } from "~/utils/download-file";
import { isApiError } from "~/lib/api-client";

/** The backend refuses annotations on anything else (422 UNSUPPORTED_ANNOTATION_FILE_TYPE). */
const ANNOTATABLE = new Set(["pdf", "word"]);

const ZOOM_STEPS = [0.75, 1, 1.25, 1.5, 2];

/**
 * The submission side of the marking workspace: the student's files, the PDF itself, and the
 * marker's own comments on it.
 *
 * Three surfaces in one because the file type decides how much is possible, and the marker
 * shouldn't have to know which: a **PDF** renders inline with click-to-pin; a **Word** file can't
 * render in a browser but still accepts comments, so it gets the comment panel with a page number
 * typed by hand; anything else (code, video) is download-only and says so.
 *
 * Every comment shown here is the marker's own. Another marker's pins on the same file are never
 * fetched, and nothing indicates whether any exist.
 */
export function SubmissionViewer({
  moduleId,
  studentId,
}: {
  moduleId: string;
  studentId: string;
}) {
  const { data, isLoading, isError, error, refetch, isFetching } = useStudentSubmissions(
    moduleId,
    studentId,
  );
  const submissions = useMemo(() => data ?? [], [data]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Default to the first PDF — it's the one that can actually be read on screen — and only fall
  // back to the first file of any kind when there's no PDF at all.
  const selected = useMemo(() => {
    if (submissions.length === 0) return null;
    const chosen = submissions.find((item) => item.id === selectedId);
    return chosen ?? submissions.find((item) => item.fileType === "pdf") ?? submissions[0];
  }, [submissions, selectedId]);

  if (isError) {
    return (
      <ErrorCard
        title="Couldn't load the submission"
        error={error}
        description={
          isApiError(error) && error.statusCode === 404
            ? "This project isn't assigned to you, so there's nothing here to open."
            : undefined
        }
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 py-6">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!selected) {
    return (
      <Card>
        <CardContent className="py-4">
          <Empty className="px-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileText aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Nothing uploaded yet</EmptyTitle>
              <EmptyDescription>
                The coordinator hasn't imported this student's work from Learn. You can still
                score the rubric, but there's nothing to read alongside it.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <SubmissionPane
      // Remounting per file resets page, zoom and the open comment together, which is what
      // switching file should mean — carrying "page 7" onto a two-page appendix would not.
      key={selected.id}
      moduleId={moduleId}
      studentId={studentId}
      submissions={submissions}
      submission={selected}
      onSelect={setSelectedId}
    />
  );
}

function SubmissionPane({
  moduleId,
  studentId,
  submissions,
  submission,
  onSelect,
}: {
  moduleId: string;
  studentId: string;
  submissions: SubmissionListItem[];
  submission: SubmissionListItem;
  onSelect: (id: string) => void;
}) {
  const isPdf = submission.fileType === "pdf";
  const canAnnotate = ANNOTATABLE.has(submission.fileType);

  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingPoint, setPendingPoint] = useState<PdfPoint | null>(null);
  const [editing, setEditing] = useState<AnnotationResponse | null>(null);
  const [composing, setComposing] = useState(false);
  const [deleting, setDeleting] = useState<AnnotationResponse | null>(null);

  const resolveUrl = useResolveDownloadUrl(moduleId);
  const { data: annotationData } = useAnnotations(moduleId, studentId, submission.id);
  const annotations = useMemo(() => annotationData ?? [], [annotationData]);
  const { create, update, remove } = useAnnotationMutations(moduleId, studentId, submission.id);

  // Resolve a URL for the inline viewer as soon as a PDF is on screen. Not done for other file
  // types: their only action is "open it", which resolves a fresh URL on click — one fetched now
  // would be dead by the time anybody pressed it.
  useEffect(() => {
    if (!isPdf) return;
    let cancelled = false;
    resolveUrl.mutate(
      { studentId, submissionId: submission.id },
      {
        onSuccess: (result) => {
          if (!cancelled) setFileUrl(result.url);
        },
      },
    );
    return () => {
      cancelled = true;
    };
    // Deliberately keyed on the file alone: re-running when the mutation object changes identity
    // would re-issue a presigned URL on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPdf, studentId, submission.id]);

  function openFileInNewTab() {
    resolveUrl.mutate(
      { studentId, submissionId: submission.id },
      {
        onSuccess: (result) => downloadUrlInNewTab(result.url),
        onError: () => toast.error("Couldn't get a link for that file. Try again."),
      },
    );
  }

  const pageAnnotations = useMemo(
    () => annotations.filter((item) => item.pageNumber === page),
    [annotations, page],
  );

  const mutationError = create.error ?? update.error;
  const isWriting = create.isPending || update.isPending;

  function closeDialog() {
    setPendingPoint(null);
    setEditing(null);
    setComposing(false);
    create.reset();
    update.reset();
  }

  function submitAnnotation(values: {
    content: string;
    highlightText?: string;
    pageNumber: number;
    posX: number;
    posY: number;
  }) {
    if (editing) {
      update.mutate(
        {
          annotationId: editing.id,
          content: values.content,
          highlightText: values.highlightText ?? "",
        },
        {
          onSuccess: ({ message }) => {
            toast.success(message);
            closeDialog();
          },
        },
      );
      return;
    }

    create.mutate(values, {
      onSuccess: ({ message }) => {
        toast.success(message);
        closeDialog();
      },
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Submission</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={openFileInNewTab}
                disabled={resolveUrl.isPending}
              >
                <ExternalLink aria-hidden="true" />
                Open file
              </Button>
            </div>
          </div>

          {submissions.length > 1 && (
            <Select value={submission.id} onValueChange={onSelect}>
              <SelectTrigger aria-label="Choose which submitted file to view">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {submissions.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.originalFilename}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {!isPdf && (
            <Callout variant={canAnnotate ? "info" : "warning"}>
              <p>
                <span className="font-medium">{submission.originalFilename}</span> can't be shown
                in the browser.{" "}
                {canAnnotate
                  ? "Open it in a new tab to read it — you can still add comments below, giving the page number yourself."
                  : "Open it in a new tab to read it. Comments are only supported on PDF and Word files, so there's nothing to pin here."}
              </p>
            </Callout>
          )}

          {isPdf && !fileUrl && <Skeleton className="h-96 w-full" />}

          {isPdf && fileUrl && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={page <= 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft aria-hidden="true" />
                  </Button>
                  <span className="px-2 text-sm tabular-nums text-muted-foreground" aria-live="polite">
                    Page {page} of {pageCount}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                    disabled={page >= pageCount}
                    aria-label="Next page"
                  >
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setZoom((value) => previousStep(value))}
                    disabled={zoom <= ZOOM_STEPS[0]}
                    aria-label="Zoom out"
                  >
                    <Minus aria-hidden="true" />
                  </Button>
                  <span className="px-1 text-sm tabular-nums text-muted-foreground">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setZoom((value) => nextStep(value))}
                    disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
                    aria-label="Zoom in"
                  >
                    <Plus aria-hidden="true" />
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Click anywhere on the page to pin a comment. Only you can see your comments.
              </p>

              <div className="max-h-[70vh] overflow-auto rounded-md bg-muted/30 p-2">
                <PdfViewer
                  url={fileUrl}
                  page={page}
                  zoom={zoom}
                  pageLabel={`${submission.originalFilename}, page ${page}`}
                  onDocumentLoad={setPageCount}
                  onPointSelect={setPendingPoint}
                  overlay={() => (
                    <AnnotationPins
                      annotations={pageAnnotations}
                      activeId={activeId}
                      onSelect={(annotation) => {
                        setActiveId(annotation.id);
                        setEditing(annotation);
                      }}
                    />
                  )}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {canAnnotate && (
        <AnnotationList
          annotations={annotations}
          activeId={activeId}
          onFocus={(annotation) => {
            setActiveId(annotation.id);
            setPage(annotation.pageNumber);
          }}
          onEdit={setEditing}
          onDelete={setDeleting}
          onCompose={() => setComposing(true)}
        />
      )}

      {(pendingPoint !== null || editing !== null || composing) && (
        <AnnotationFormDialog
          // Remount per target so the fields start from the right values rather than being reset
          // by an effect after the fact.
          key={editing?.id ?? (pendingPoint ? `${pendingPoint.x}:${pendingPoint.y}` : "compose")}
          open
          onOpenChange={(next) => !next && closeDialog()}
          annotation={editing ?? undefined}
          point={pendingPoint ?? undefined}
          pageNumber={page}
          pageCount={pageCount}
          isPending={isWriting}
          error={mutationError}
          onSubmit={submitAnnotation}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(next) => !next && setDeleting(null)}
        title="Delete this comment?"
        description="It's removed for good. Nobody else could see it, so nothing about the student's marking changes."
        confirmLabel="Delete comment"
        pendingLabel="Deleting…"
        destructive
        isPending={remove.isPending}
        icon={Trash2}
        onConfirm={() => {
          if (!deleting) return;
          remove.mutate(deleting.id, {
            onSuccess: ({ message }) => {
              toast.success(message);
              setDeleting(null);
            },
            onError: () => toast.error("Couldn't delete that comment. Try again."),
          });
        }}
      />
    </div>
  );
}

function AnnotationList({
  annotations,
  activeId,
  onFocus,
  onEdit,
  onDelete,
  onCompose,
}: {
  annotations: AnnotationResponse[];
  activeId: string | null;
  onFocus: (annotation: AnnotationResponse) => void;
  onEdit: (annotation: AnnotationResponse) => void;
  onDelete: (annotation: AnnotationResponse) => void;
  onCompose: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">
          Your comments{" "}
          <Badge variant="secondary" className="ml-1">
            {annotations.length}
          </Badge>
        </CardTitle>
        {/* The keyboard path to creating one. Dropping a pin needs a pointer, so without this
            there would be no way in at all without a mouse. */}
        <Button variant="outline" size="sm" onClick={onCompose}>
          <MessageSquarePlus aria-hidden="true" />
          Add comment
        </Button>
      </CardHeader>
      <CardContent>
        {annotations.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            No comments yet. They're private to you — no other marker on this project sees them, or
            knows they exist.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {annotations.map((annotation, index) => (
              <li key={annotation.id} className="flex items-start gap-3 py-3">
                <button
                  type="button"
                  onClick={() => onFocus(annotation)}
                  className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-semibold text-amber-950 hover:bg-amber-300 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-label={`Go to comment ${index + 1} on page ${annotation.pageNumber}`}
                >
                  <span aria-hidden="true">{index + 1}</span>
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">
                    Page {annotation.pageNumber}
                    {activeId === annotation.id && " · selected"}
                  </p>
                  {annotation.highlightText && (
                    <p className="mt-1 border-l-2 border-border pl-2 text-xs italic text-muted-foreground">
                      {annotation.highlightText}
                    </p>
                  )}
                  <p className="mt-1 text-sm whitespace-pre-wrap text-foreground">
                    {annotation.content}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(annotation)}
                    aria-label={`Edit comment ${index + 1}`}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(annotation)}
                    aria-label={`Delete comment ${index + 1}`}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function nextStep(current: number): number {
  return ZOOM_STEPS.find((step) => step > current) ?? current;
}

function previousStep(current: number): number {
  return [...ZOOM_STEPS].reverse().find((step) => step < current) ?? current;
}
