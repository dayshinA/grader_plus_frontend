import type { AnnotationResponse } from "~/features/grading/types";
import { cn } from "~/lib/utils";

/**
 * The marker's own pins, drawn over a rendered page.
 *
 * Positions are `posX`/`posY` written out as percentages. The stored values are already page
 * fractions, so nothing here converts pixels and the overlay needs no knowledge of the page's
 * rendered size — a pin lands in the same spot at any zoom or window width, which is the whole
 * reason the backend stores fractions.
 *
 * Each pin is a real `<button>`, so the overlay carries no semantics of its own and the pins are
 * tabbable in document order.
 */
export function AnnotationPins({
  annotations,
  activeId,
  onSelect,
}: {
  /** Already filtered to the page on screen by the caller. */
  annotations: AnnotationResponse[];
  activeId: string | null;
  onSelect: (annotation: AnnotationResponse) => void;
}) {
  return (
    <>
      {annotations.map((annotation, index) => (
        <button
          key={annotation.id}
          type="button"
          // Stops the click falling through to the page, which would drop a second pin on top of
          // the one being opened.
          onClick={(event) => {
            event.stopPropagation();
            onSelect(annotation);
          }}
          style={{
            left: `${annotation.posX * 100}%`,
            top: `${annotation.posY * 100}%`,
          }}
          className={cn(
            "absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center",
            "rounded-full border-2 border-background text-xs font-semibold shadow-md",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
            activeId === annotation.id
              ? "bg-primary text-primary-foreground"
              : "bg-amber-400 text-amber-950 hover:bg-amber-300",
          )}
          aria-label={`Comment ${index + 1} on page ${annotation.pageNumber}: ${annotation.content}`}
        >
          <span aria-hidden="true">{index + 1}</span>
        </button>
      ))}
    </>
  );
}
