import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import { ErrorCard } from "~/components/ui/error-card";
import { PdfViewer, type PdfTextSelection } from "~/components/ui/pdf-viewer";
import { Skeleton } from "~/components/ui/skeleton";
import { intakeService } from "~/features/intake/api/intake.service";
import type { Submission } from "~/features/intake/types";
import { useAnnotations } from "~/features/marking/api/use-marking";
import { AnnotationPanel } from "~/features/marking/components/annotation-panel";
import type { Annotation, AnnotationRect } from "~/features/marking/types";
import { formatFileSize } from "~/utils/format";
import { downloadUrlInNewTab } from "~/utils/download-file";
import { cn } from "~/lib/utils";

/**
 * Signed URLs are short lived, so one is fetched when a file is opened rather than when the
 * workspace loads, and refetched before it expires rather than being held in state.
 */
function useSignedUrl(submissionId: string) {
  return useQuery({
    queryKey: ["marking", "submission-url", submissionId],
    queryFn: () => intakeService.submissionUrl(submissionId),
    // Well inside the server's cap, so a link is replaced before it dies rather than after.
    staleTime: 4 * 60 * 1000,
    refetchInterval: 4 * 60 * 1000,
  });
}

function Pin({
  annotation,
  index,
  focused,
}: {
  annotation: Annotation;
  index: number;
  focused: boolean;
}) {
  return (
    <span
      className={cn(
        "absolute flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground shadow-sm transition-transform",
        focused && "scale-125 ring-2 ring-primary/40",
      )}
      style={{ left: `${annotation.x * 100}%`, top: `${annotation.y * 100}%` }}
    >
      {index}
      <span className="sr-only">{annotation.body}</span>
    </span>
  );
}

/**
 * The boxes of one text highlight. Decorative: the note itself is announced through the
 * panel's list, the same as a pin.
 */
function HighlightMarks({
  rects,
  focused = false,
  pending = false,
}: {
  rects: AnnotationRect[];
  focused?: boolean;
  pending?: boolean;
}) {
  return (
    <>
      {rects.map((rect, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={cn(
            "absolute rounded-xs bg-primary/25",
            focused && "bg-primary/40 ring-1 ring-primary/60",
            pending && "animate-pulse bg-primary/30",
          )}
          style={{
            left: `${rect.x * 100}%`,
            top: `${rect.y * 100}%`,
            width: `${rect.width * 100}%`,
            height: `${rect.height * 100}%`,
          }}
        />
      ))}
    </>
  );
}

/**
 * One file, its pages, and the caller's own notes on them. Mounted keyed on the submission
 * id, so switching files resets the page, the zoom and any half placed note without an
 * effect chasing the change.
 */
function FileViewer({
  file,
  readOnly,
  toolbarExtra,
}: {
  file: Submission;
  readOnly: boolean;
  toolbarExtra?: ReactNode;
}) {
  const link = useSignedUrl(file.id);
  const annotations = useAnnotations(file.isAnnotatable ? file.id : undefined);

  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [pendingPoint, setPendingPoint] = useState<{ x: number; y: number } | null>(null);
  const [pendingSelection, setPendingSelection] = useState<PdfTextSelection | null>(null);
  const [focusedPin, setFocusedPin] = useState<string | undefined>();

  // One pending note at a time: starting a pin abandons a half placed highlight and the
  // other way round, matching what the panel's single form can show.
  function handlePointSelect(point: { x: number; y: number }) {
    setPendingSelection(null);
    setPendingPoint(point);
  }

  function handleTextSelect(selection: PdfTextSelection) {
    setPendingPoint(null);
    setPendingSelection(selection);
    // The preview boxes take over from the browser's own selection paint; leaving both
    // visible doubles the tint and makes the pending state look saved already.
    window.getSelection()?.removeAllRanges();
  }

  function clearPending() {
    setPendingPoint(null);
    setPendingSelection(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{file.originalFilename}</p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(file.sizeBytes)}
            {file.isAnnotatable ? " · annotatable" : " · download only"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 cursor-pointer"
          disabled={!link.data}
          onClick={() => link.data && downloadUrlInNewTab(link.data.url)}
        >
          <Download className="size-4" aria-hidden="true" />
          Open
        </Button>
      </div>

      {!file.isAnnotatable ? (
        <Callout variant="info" title="This file cannot be annotated">
          Pins only work on PDF files. A Word document has to be converted before it can be
          shown, and that can shift its pages, so a pin could end up pointing at the wrong
          place. Download it instead, and leave your comments on the criteria or in the
          general feedback.
        </Callout>
      ) : link.isPending ? (
        <Skeleton className="h-96 rounded-lg" />
      ) : link.isError ? (
        <ErrorCard
          title="Could not open this file"
          error={link.error}
          onRetry={() => void link.refetch()}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-9 cursor-pointer"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <span className="px-2 text-sm tabular-nums text-muted-foreground">
                {page} of {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-9 cursor-pointer"
                disabled={page >= pageCount}
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              >
                Next
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 cursor-pointer"
                disabled={zoom <= 0.6}
                onClick={() => setZoom((current) => Math.max(0.6, current - 0.2))}
              >
                <ZoomOut className="size-4" aria-hidden="true" />
                <span className="sr-only">Zoom out</span>
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 cursor-pointer"
                disabled={zoom >= 2.5}
                onClick={() => setZoom((current) => Math.min(2.5, current + 0.2))}
              >
                <ZoomIn className="size-4" aria-hidden="true" />
                <span className="sr-only">Zoom in</span>
              </Button>
              {toolbarExtra}
            </div>
          </div>

          <PdfViewer
            url={link.data.url}
            page={page}
            zoom={zoom}
            onDocumentLoad={setPageCount}
            onPointSelect={readOnly ? undefined : handlePointSelect}
            onTextSelect={readOnly ? undefined : handleTextSelect}
            pageLabel={`${file.originalFilename}, page ${page}`}
            overlay={() => (
              <>
                {(annotations.data ?? [])
                  .filter((annotation) => annotation.page === page)
                  .map((annotation, index) =>
                    annotation.rects ? (
                      <HighlightMarks
                        key={annotation.id}
                        rects={annotation.rects}
                        focused={focusedPin === annotation.id}
                      />
                    ) : (
                      <Pin
                        key={annotation.id}
                        annotation={annotation}
                        index={index + 1}
                        focused={focusedPin === annotation.id}
                      />
                    ),
                  )}
                {pendingPoint && (
                  <span
                    aria-hidden="true"
                    className="absolute size-5 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-2 border-primary bg-primary/30"
                    style={{
                      left: `${pendingPoint.x * 100}%`,
                      top: `${pendingPoint.y * 100}%`,
                    }}
                  />
                )}
                {pendingSelection && <HighlightMarks rects={pendingSelection.rects} pending />}
              </>
            )}
          />

          <AnnotationPanel
            submissionId={file.id}
            annotations={annotations.data ?? []}
            page={page}
            pendingPoint={pendingPoint}
            pendingSelection={pendingSelection}
            onPendingHandled={clearPending}
            onFocusPin={(annotation) => {
              setPage(annotation.page);
              setFocusedPin(annotation.id);
            }}
            readOnly={readOnly}
          />
        </>
      )}
    </div>
  );
}

/**
 * The document pane: a file switcher, and the file currently open.
 *
 * The notes shown here belong to the caller's own evaluation. Two markers annotating the
 * same page never see each other's, because a note is keyed on the evaluation and not on
 * the submission alone.
 */
export function DocumentPane({
  files,
  readOnly,
  toolbarExtra,
}: {
  files: Submission[];
  readOnly: boolean;
  /** Rendered after the zoom controls. The workspace puts its focus toggle here. */
  toolbarExtra?: ReactNode;
}) {
  const [activeId, setActiveId] = useState(files[0]?.id);
  const active = files.find((file) => file.id === activeId) ?? files[0];

  if (files.length === 0) {
    return (
      <Callout variant="warning" title="Nothing to read">
        No file is attached to this project. Tell the coordinator: there is nothing here to
        mark against.
      </Callout>
    );
  }

  return (
    <div className="space-y-4">
      {files.length > 1 && (
        <div
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
          role="tablist"
          aria-label="Submitted files"
        >
          {files.map((file) => (
            <button
              key={file.id}
              type="button"
              role="tab"
              aria-selected={file.id === active.id}
              onClick={() => setActiveId(file.id)}
              className={cn(
                "flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                file.id === active.id
                  ? "border-primary bg-accent/60"
                  : "border-border hover:bg-accent/40",
              )}
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="max-w-40 truncate">{file.originalFilename}</span>
            </button>
          ))}
        </div>
      )}

      <FileViewer key={active.id} file={active} readOnly={readOnly} toolbarExtra={toolbarExtra} />
    </div>
  );
}
