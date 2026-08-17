import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist/types/src/display/api";
import type { TextLayer } from "pdfjs-dist";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "~/lib/utils";

/** A point on a page as fractions of its width/height, 0 to 1, never pixels. */
export interface PdfPoint {
  x: number;
  y: number;
}

/** A rectangle on a page, all four values as fractions of the page's size. */
export interface PdfRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A text selection on the page: the text, and one rect per rendered line. */
export interface PdfTextSelection {
  text: string;
  rects: PdfRect[];
}

/** The rendered page's CSS size, for positioning an overlay on top of it. */
export interface PdfPageSize {
  width: number;
  height: number;
}

export type PdfViewerStatus = "loading" | "ready" | "error";

/**
 * pdf.js is loaded on first use rather than imported at module scope.
 *
 * It is by far the heaviest dependency in the app and exactly one screen needs it, so a static
 * import would put it in the initial bundle for every user including those who never mark
 * anything. Cached in a module-level promise so a second viewer doesn't re-import it.
 */
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

function loadPdfjs(): Promise<typeof import("pdfjs-dist")> {
  pdfjsPromise ??= import("pdfjs-dist").then((pdfjs) => {
    // The Vite-supported form: `new URL(..., import.meta.url)` lets the bundler fingerprint and
    // emit the worker as its own chunk. Setting `workerSrc` to a bare path instead would work in
    // dev and 404 in a production build, where the file is hashed.
    pdfjs.GlobalWorkerOptions.workerPort = new Worker(
      new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
      { type: "module" },
    );
    return pdfjs;
  });
  return pdfjsPromise;
}

/**
 * Renders one page of a PDF to a canvas, scaled to fit its container, with a selectable text
 * layer on top and an optional overlay positioned in the page's own coordinate space.
 *
 * Built for annotating a submission, but deliberately knows nothing about annotations: it reports
 * clicks as `{ x, y }` fractions, text selections as the text plus per-line rect fractions, and
 * hands the overlay the page's rendered size, leaving what to draw entirely to the caller.
 * Fractions rather than pixels because that's what survives a resize or a zoom, the same reason
 * the backend stores its annotation geometry that way.
 *
 * @remarks
 * `url` is fetched by pdf.js from the browser, so a cross-origin source must send CORS headers.
 * For a presigned object-storage URL that means bucket-level CORS allowing this app's origin;
 * without it the fetch fails and this renders its error state. Callers should offer a
 * download/open-in-new-tab fallback rather than treating a failure here as fatal.
 */
export function PdfViewer({
  url,
  page,
  zoom = 1,
  onDocumentLoad,
  onPointSelect,
  onTextSelect,
  overlay,
  onStatusChange,
  className,
  pageLabel = "Submission page",
}: {
  url: string;
  /** 1-based. Clamped to the document's page count. */
  page: number;
  /** Multiplier on top of fit-to-width. 1 fills the container. */
  zoom?: number;
  onDocumentLoad?: (pageCount: number) => void;
  /** Fires with page fractions when the page is clicked. Omit to make clicks inert. */
  onPointSelect?: (point: PdfPoint) => void;
  /** Fires when the pointer is released over a non-empty text selection on this page. */
  onTextSelect?: (selection: PdfTextSelection) => void;
  /** Drawn on top of the page, in a box exactly matching its rendered size. */
  overlay?: (size: PdfPageSize) => ReactNode;
  onStatusChange?: (status: PdfViewerStatus, error?: unknown) => void;
  className?: string;
  /** Describes the page for screen readers, since a canvas is opaque to them. */
  pageLabel?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerContainerRef = useRef<HTMLDivElement | null>(null);
  const textLayerRef = useRef<TextLayer | null>(null);
  const documentRef = useRef<PDFDocumentProxy | null>(null);
  // Held separately from the document proxy: `destroy()` (abort the fetch, tear down the worker)
  // lives on the loading task, not on the proxy it resolves to.
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);

  const [containerWidth, setContainerWidth] = useState(0);
  const [pageSize, setPageSize] = useState<PdfPageSize | null>(null);
  const [scale, setScale] = useState(1);
  const [status, setStatus] = useState<PdfViewerStatus>("loading");
  const [error, setError] = useState<unknown>(null);

  // Kept in a ref so the render effect doesn't re-run every time a parent passes a new closure.
  const statusChangeRef = useRef(onStatusChange);
  const documentLoadRef = useRef(onDocumentLoad);
  useEffect(() => {
    statusChangeRef.current = onStatusChange;
    documentLoadRef.current = onDocumentLoad;
  });

  const report = useCallback((next: PdfViewerStatus, cause?: unknown) => {
    setStatus(next);
    setError(cause ?? null);
    statusChangeRef.current?.(next, cause);
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      // Whole pixels only: sub-pixel jitter from a flex parent would otherwise re-render the page
      // on every frame of a resize.
      setContainerWidth(Math.floor(width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Load (and reload) the document.
  useEffect(() => {
    let cancelled = false;
    report("loading");
    setPageSize(null);

    const task = loadPdfjs().then((pdfjs) =>
      pdfjs.getDocument({
        url,
        // Fetch the whole file in one request instead of streaming it in ranges as pages are
        // viewed. The only URLs this viewer is pointed at are presigned and short-lived (300s),
        // so a range request issued ten minutes into a marking session would 403 against an
        // expired signature and break the document halfway through. One up-front download costs
        // more on page one and cannot fail later.
        disableRange: true,
        disableStream: true,
      }),
    );

    void task
      .then(async (loadingTask) => {
        loadingTaskRef.current = loadingTask;
        const pdf = await loadingTask.promise;
        if (cancelled) {
          void loadingTask.destroy();
          return;
        }
        documentRef.current = pdf;
        documentLoadRef.current?.(pdf.numPages);
        report("ready");
      })
      .catch((cause: unknown) => {
        if (!cancelled) report("error", cause);
      });

    return () => {
      cancelled = true;
      // Order matters: a render task holding the canvas must be cancelled before the document it
      // belongs to is destroyed, or pdf.js throws on the dangling task.
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      textLayerRef.current?.cancel();
      textLayerRef.current = null;
      documentRef.current = null;
      const loadingTask = loadingTaskRef.current;
      loadingTaskRef.current = null;
      void loadingTask?.destroy();
    };
  }, [url, report]);

  // Render the current page whenever it, the zoom, or the available width changes.
  useEffect(() => {
    const pdf = documentRef.current;
    const canvas = canvasRef.current;
    if (status === "error" || !pdf || !canvas || containerWidth === 0) return;

    let cancelled = false;

    void (async () => {
      try {
        const pageNumber = Math.min(Math.max(1, page), pdf.numPages);
        const proxy = await pdf.getPage(pageNumber);
        if (cancelled) return;

        // Scale so the page fills the container at zoom 1, then apply the caller's zoom on top.
        const unscaled = proxy.getViewport({ scale: 1 });
        const viewport = proxy.getViewport({
          scale: (containerWidth / unscaled.width) * zoom,
        });

        // Back the canvas at device resolution but lay it out at CSS size, so text stays sharp on
        // a HiDPI screen without the overlay's coordinate space changing.
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        // A canvas can only be in one render at a time, so cancel the previous before starting.
        renderTaskRef.current?.cancel();

        const task = proxy.render({
          canvas,
          viewport,
          transform:
            outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
        });
        renderTaskRef.current = task;
        await task.promise;
        if (cancelled) return;

        renderTaskRef.current = null;
        setScale(viewport.scale);
        setPageSize({
          width: Math.floor(viewport.width),
          height: Math.floor(viewport.height),
        });

        // The text layer sits invisibly over the canvas so text can be selected. Its failure is
        // deliberately non-fatal: a scanned PDF has no text to lay out, and the page is still
        // perfectly readable and clickable without one.
        const textContainer = textLayerContainerRef.current;
        if (textContainer) {
          textLayerRef.current?.cancel();
          textContainer.replaceChildren();
          try {
            const { TextLayer: TextLayerClass } = await loadPdfjs();
            if (cancelled) return;
            const textLayer = new TextLayerClass({
              textContentSource: proxy.streamTextContent(),
              container: textContainer,
              viewport,
            });
            textLayerRef.current = textLayer;
            await textLayer.render();
          } catch {
            textContainer.replaceChildren();
          }
        }
      } catch (cause) {
        // A cancelled render is the expected outcome of a fast resize or page flick, not a failure.
        if (cancelled || (cause as { name?: string })?.name === "RenderingCancelledException") {
          return;
        }
        report("error", cause);
      }
    })();

    return () => {
      cancelled = true;
      textLayerRef.current?.cancel();
      textLayerRef.current = null;
    };
  }, [page, zoom, containerWidth, status, report]);

  // One handler decides what a pointer release means: a live text selection anchored in the
  // text layer is a highlight, a collapsed one is a click. The browser collapses the selection
  // on mousedown, so a plain click never arrives here looking like a selection.
  function handleMouseUp(event: React.MouseEvent<HTMLDivElement>) {
    if (!pageSize) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const selection = window.getSelection();

    if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = textLayerContainerRef.current;
      if (!container?.contains(range.commonAncestorContainer)) return;
      if (!onTextSelect) return;

      const text = selection.toString().replace(/\s+/g, " ").trim();
      if (!text) return;

      const rects: PdfRect[] = [];
      for (const rect of range.getClientRects()) {
        if (rect.width < 1 || rect.height < 1) continue;
        rects.push({
          x: clamp01((rect.left - bounds.left) / bounds.width),
          y: clamp01((rect.top - bounds.top) / bounds.height),
          width: clamp01(rect.width / bounds.width),
          height: clamp01(rect.height / bounds.height),
        });
      }
      const merged = mergeLineRects(rects);
      if (merged.length > 0) onTextSelect({ text, rects: merged });
      return;
    }

    if (!onPointSelect) return;
    onPointSelect({
      x: clamp01((event.clientX - bounds.left) / bounds.width),
      y: clamp01((event.clientY - bounds.top) / bounds.height),
    });
  }

  const interactive = Boolean(onPointSelect || onTextSelect);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div
        className={cn(
          "pdf-page-surface relative mx-auto",
          onPointSelect && "cursor-crosshair",
        )}
        style={
          {
            ...(pageSize ? { width: pageSize.width } : undefined),
            "--scale-factor": String(scale),
          } as React.CSSProperties
        }
        onMouseUp={interactive ? handleMouseUp : undefined}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={pageLabel}
          className={cn(
            "block w-full rounded-md border border-border bg-white shadow-sm",
            status !== "ready" && "invisible",
          )}
        />

        <div
          ref={textLayerContainerRef}
          className={cn("textLayer", status !== "ready" && "invisible")}
        />

        {pageSize && status === "ready" && (
          // Presentational and inert to the pointer, so selecting text through it works. The pins
          // inside are announced by the panel beside the page, which also has a form-based
          // "Add comment" for anyone not using a pointer.
          <div className="pointer-events-none absolute inset-0">
            {overlay?.(pageSize)}
          </div>
        )}
      </div>

      {status === "loading" && (
        <div
          role="status"
          aria-live="polite"
          className="flex min-h-64 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground"
        >
          Loading the document…
        </div>
      )}

      {status === "error" && (
        <PdfLoadError error={error} />
      )}
    </div>
  );
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * The browser reports one client rect per text span the selection crosses, so a single visual
 * line arrives as several abutting rects that would double-darken a translucent highlight at
 * every seam. Rects that overlap vertically by more than half their height are the same line
 * and are merged into one.
 */
function mergeLineRects(rects: PdfRect[]): PdfRect[] {
  const sorted = [...rects].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: PdfRect[] = [];

  for (const rect of sorted) {
    const last = lines[lines.length - 1];
    const overlap = last
      ? Math.min(last.y + last.height, rect.y + rect.height) - Math.max(last.y, rect.y)
      : 0;

    if (last && overlap > 0.5 * Math.min(last.height, rect.height)) {
      const x = Math.min(last.x, rect.x);
      const y = Math.min(last.y, rect.y);
      const right = Math.max(last.x + last.width, rect.x + rect.width);
      const bottom = Math.max(last.y + last.height, rect.y + rect.height);
      lines[lines.length - 1] = { x, y, width: right - x, height: bottom - y };
    } else {
      lines.push(rect);
    }
  }

  return lines;
}

/**
 * Deliberately names the likely cause. A cross-origin fetch blocked by a missing CORS header fails
 * with an opaque "Failed to fetch", which tells whoever hits it nothing actionable, and this is
 * the single most likely way the viewer breaks in a new environment.
 */
function PdfLoadError({ error }: { error: unknown }) {
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <p className="font-medium text-foreground">Couldn't display this document</p>
      <p className="mt-1 text-muted-foreground">
        The file may not be a readable PDF, or the storage bucket may not allow this site to read
        it directly. Use the download link to open it in a new tab instead, where you can still add
        comments from the panel beside this one.
      </p>
      {error instanceof Error && error.message && (
        <p className="mt-2 font-mono text-xs text-muted-foreground">{error.message}</p>
      )}
    </div>
  );
}
