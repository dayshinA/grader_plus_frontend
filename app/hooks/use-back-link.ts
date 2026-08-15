import { useLocation } from "react-router";

/**
 * Where a screen's back link should go, carried on the navigation that opened it.
 *
 * A screen is reachable from several places. An offering opens from home, from its unit's
 * progress table, from the modules panel or from the sidebar, so a back link the screen
 * decides for itself either drops somebody where they were not or claims a route nobody
 * took. The linking side is the only side that knows, so it states it, and a screen opened
 * without one renders no back link.
 */
export interface BackTarget {
  /** An in-app path. Absolute (`/admin/users?page=3`), and it may carry a query string. */
  to: string;
  /** The destination, named as a noun phrase, rendered as "Back to {label}". */
  label: string;
  /**
   * Where the destination should point back to once we return to it. A case opened from an
   * offering's discrepancy list is two steps from wherever the offering was opened, and
   * going back is a fresh navigation carrying no history of its own, so the trail is
   * restored by declaring it rather than by walking the history stack.
   */
  back?: BackTarget;
}

/**
 * Wraps a {@link BackTarget} as router state for a `<Link>`:
 * `<Link to={...} state={backTo({ to: "/admin/units", label: "academic units" })}>`.
 *
 * An object literal is fine here, unlike `<Navigate state={...}>`, because this one is built on
 * click rather than on every render: no new location every render, so no loop to fall into.
 */
export function backTo(target: BackTarget): { back: BackTarget } {
  return { back: target };
}

/**
 * Only an in-app path is accepted. History state survives a reload and is editable by anyone
 * with devtools, so a `to` that could leave the app, an absolute URL, a protocol relative
 * `//host` or a `javascript:` URL, is dropped rather than rendered into an anchor.
 */
function isBackTarget(value: unknown): value is BackTarget {
  if (!value || typeof value !== "object") return false;
  const { to, label, back } = value as Partial<BackTarget>;
  if (back !== undefined && !isBackTarget(back)) return false;
  return (
    typeof to === "string" && to.startsWith("/") && !to.startsWith("//") && typeof label === "string"
  );
}

/**
 * The back target this screen was opened with, or undefined when it was opened cold: from the
 * sidebar, a pasted URL, a bookmark or a hard refresh, none of which carry history state.
 *
 * Undefined is the common answer and it means what it says. A screen renders no back link at
 * all rather than inventing one, and a screen that links deeper passes this along so the
 * trail behind it survives the return trip.
 */
export function useDeclaredBackTarget(): BackTarget | undefined {
  const { state } = useLocation();
  const back = (state as { back?: unknown } | null)?.back;
  return isBackTarget(back) ? back : undefined;
}
