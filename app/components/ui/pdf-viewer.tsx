import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist/types/src/display/api";
import type { TextLayer } from "pdfjs-dist";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "~/lib/utils";

/** A point on a page, as fractions of its width and height. Never pixels. */
export interface PdfPoint {
  x: number;
  y: number;
}

/** A rectangle on a page, all four values as fractions of the page size. */
export interface PdfRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfTextSelection {
  text: string;
  rects: PdfRect[];
}

export interface PdfPageSize {
  width: number;
  height: number;
}

export type PdfViewerStatus = "loading" | "ready" | "error";

// Loaded on first use: pdf.js is the heaviest dependency and only marking needs it.
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

function loadPdfjs(): Promise<typeof import("pdfjs-dist")> {
  pdfjsPromise ??= import("pdfjs-dist").then((pdfjs) => {
    // `new URL(..., import.meta.url)` lets Vite hash the worker. A bare path 404s in production.
    pdfjs.GlobalWorkerOptions.workerPort = new Worker(
      new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
      { type: "module" },
    );
    return pdfjs;
  });
  return pdfjsPromise;
}

// Reports clicks and selections as page fractions, which survive a resize or a zoom.
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
  /** 1-based, clamped to the page count. */
  page: number;
  /** Multiplier on top of fit-to-width. */
  zoom?: number;
  onDocumentLoad?: (pageCount: number) => void;
  onPointSelect?: (point: PdfPoint) => void;
  onTextSelect?: (selection: PdfTextSelection) => void;
  overlay?: (size: PdfPageSize) => ReactNode;
  onStatusChange?: (status: PdfViewerStatus, error?: unknown) => void;
  className?: string;
  pageLabel?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerContainerRef = useRef<HTMLDivElement | null>(null);
  const textLayerRef = useRef<TextLayer | null>(null);
  const documentRef = useRef<PDFDocumentProxy | null>(null);
  // `destroy()` lives on the loading task, not on the document it resolves to.
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);

  const [containerWidth, setContainerWidth] = useState(0);
  const [pageSize, setPageSize] = useState<PdfPageSize | null>(null);
  const [scale, setScale] = useState(1);
  const [status, setStatus] = useState<PdfViewerStatus>("loading");
  const [error, setError] = useState<unknown>(null);

  // In a ref so the render effect does not re-run when a parent passes a new closure.
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
      // Whole pixels only, or sub-pixel jitter re-renders the page on every frame of a resize.
      setContainerWidth(Math.floor(width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    report("loading");
    setPageSize(null);

    const task = loadPdfjs().then((pdfjs) =>
      pdfjs.getDocument({
        url,
        // Presigned URLs expire after 300s, so a later range request would 403 mid session.
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
      // The render task holds the canvas, so cancel it before destroying the document.
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

        const unscaled = proxy.getViewport({ scale: 1 });
        const viewport = proxy.getViewport({
          scale: (containerWidth / unscaled.width) * zoom,
        });

        // Device resolution, CSS layout size, so text stays sharp without moving the overlay space.
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        // A canvas can only be in one render at a time.
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

        // The text layer makes text selectable. A scanned PDF has none, so failing is not fatal.
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
        // A cancelled render is the normal result of a fast resize or page flick.
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

  // A live selection is a highlight, a collapsed one is a click.
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
          // Inert to the pointer so text underneath stays selectable.
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

// One line arrives as several rects, so merge any overlapping by more than half their height.
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

// Names CORS directly, because a blocked fetch only says "Failed to fetch".
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
