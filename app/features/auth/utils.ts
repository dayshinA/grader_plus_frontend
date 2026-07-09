import { ensureSessionBootstrap, getCurrentSession } from "~/lib/api-client";
import type { Role } from "~/features/auth/types";

/** Where an authenticated user of each role lands by default (post-login, or on a bare `/`). */
export function roleLandingPath(role: Role): string {
  switch (role) {
    case "coordinator":
      return "/coordinator/dashboard";
    case "marker":
      return "/marker/projects";
    case "super_admin":
      return "/super-admin/users";
  }
}

/**
 * Call at the top of a protected route's `clientLoader`, before it makes any
 * authenticated request. On a hard reload the clientLoader can run *before*
 * `AuthProvider` has mounted (React Router's SPA data router doesn't render
 * root.tsx's `<AuthProvider>` until every matched route's clientLoader
 * resolves) — without this, the loader's own fetch goes out with no token,
 * 401s, and throws, which React Router treats as an uncaught loader error
 * and renders the raw ErrorBoundary instead of the intended login redirect.
 *
 * Returns whether a session is actually available. If false, the loader
 * should skip its own fetch and return early (don't call `ensureQueryData`)
 * — `ProtectedRoute` handles the redirect to `/login` once the route tree
 * renders normally afterward, same as it does for every other protected
 * route today.
 */
export async function ensureAuthenticated(): Promise<boolean> {
  await ensureSessionBootstrap();
  return getCurrentSession() !== null;
}
