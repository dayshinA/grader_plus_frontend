import { useLocation } from "react-router";

// Set by whoever links here, because a screen reachable from several places cannot decide it.
export interface BackTarget {
  /** An absolute in-app path, query string allowed. */
  to: string;
  /** The destination as a noun phrase, rendered as "Back to {label}". */
  label: string;
  /** Where the destination points back to, so a two step trail survives the return trip. */
  back?: BackTarget;
}

/** Wraps a BackTarget as router state for a `<Link state={...}>`. */
export function backTo(target: BackTarget): { back: BackTarget } {
  return { back: target };
}

// In-app paths only: history state is editable in devtools, so an absolute or `javascript:` URL goes.
function isBackTarget(value: unknown): value is BackTarget {
  if (!value || typeof value !== "object") return false;
  const { to, label, back } = value as Partial<BackTarget>;
  if (back !== undefined && !isBackTarget(back)) return false;
  return (
    typeof to === "string" && to.startsWith("/") && !to.startsWith("//") && typeof label === "string"
  );
}

// Undefined when opened cold, and that means no back link rather than a guessed one.
export function useDeclaredBackTarget(): BackTarget | undefined {
  const { state } = useLocation();
  const back = (state as { back?: unknown } | null)?.back;
  return isBackTarget(back) ? back : undefined;
}
