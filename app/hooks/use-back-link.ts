import { useLocation } from "react-router";

/**
 * Where a detail screen's back link should go, carried on the navigation that opened it.
 *
 * A detail screen is reachable from several places — a collection can be opened from the
 * collections list, from a client's activity, or from the dashboard — and a back link that always
 * points at the domain's own list drops an admin somewhere they weren't, losing the client they
 * were working through and whatever filters got them there. So the *linking* side, which is the
 * only side that knows the answer, states it.
 */
export interface BackTarget {
  /** An in-app path. Absolute (`/clients/4`), and it may carry a query string. */
  to: string;
  /** The destination, named as a noun phrase — rendered as "Back to {label}". */
  label: string;
}

/**
 * Wraps a {@link BackTarget} as router state for a `<Link>`:
 * `<Link to={...} state={backTo({ to: "/clients/4", label: "OAA 16" })}>`.
 *
 * An object literal is fine here, unlike `<Navigate state={...}>` — this one is built on click
 * rather than on every render, so there is no new-location-every-render loop to fall into.
 */
export function backTo(target: BackTarget): { back: BackTarget } {
  return { back: target };
}

/**
 * Only an in-app path is accepted. History state survives a reload and is editable by anyone with
 * devtools, so a `to` that could leave the app — an absolute URL, a protocol-relative `//host`, a
 * `javascript:` URL — is dropped in favour of the screen's own fallback rather than rendered into
 * an anchor.
 */
function isBackTarget(value: unknown): value is BackTarget {
  if (!value || typeof value !== "object") return false;
  const { to, label } = value as Partial<BackTarget>;
  return (
    typeof to === "string" && to.startsWith("/") && !to.startsWith("//") && typeof label === "string"
  );
}

/**
 * The back target for this screen: whatever the link that opened it declared, or `fallback` when
 * the screen was opened cold — a pasted URL, a bookmark, a hard refresh — since history state
 * doesn't exist on a fresh entry.
 */
export function useBackLink(fallback: BackTarget): BackTarget {
  const { state } = useLocation();
  const back = (state as { back?: unknown } | null)?.back;
  return isBackTarget(back) ? back : fallback;
}
