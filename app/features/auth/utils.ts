import { ensureSessionBootstrap, getCurrentSession } from "~/lib/api-client";
import { bestHierarchyLevel, hasRole } from "~/features/permissions/utils";
import type { UserPermissionsSummary } from "~/features/permissions/types";

/**
 * Where an authenticated user lands by default (post-login, or on a bare `/`).
 *
 * A user holds a *list* of role templates now and can legitimately hold several
 * at once — the seed's `deptadmin@` is a Department Admin **and** a
 * module-scoped Project Coordinator — so landing is chosen by seniority rather
 * than by a single role value: the lowest `hierarchyLevel` wins.
 *
 * Coordinator and Marker are both level 3 (siblings under Department Admin,
 * neither outranking the other), so that tie has to be broken explicitly. It
 * breaks toward Coordinator: someone holding both is far more likely to be
 * doing coordination work, and their marking queue is one nav click away.
 */
export function landingPath(summary: UserPermissionsSummary | null): string {
  // Reachable now, unlike under the old role enum: a user whose every
  // assignment has been revoked, or one created with a scope the backend
  // rejected. They must land somewhere terminal — /unauthorized sits outside
  // the protected tree and renders a static explanation, so it can't bounce.
  if (bestHierarchyLevel(summary) === null) return "/unauthorized";

  if (hasRole(summary, "super_admin")) return "/super-admin/users";

  // School Admin, Department Admin and Project Coordinator all work out of the
  // assessment screens — the URL prefix is a section name, not a role claim
  // (decision #39).
  if (hasRole(summary, "school_admin")) return "/coordinator/dashboard";
  if (hasRole(summary, "department_admin")) return "/coordinator/dashboard";
  if (hasRole(summary, "project_coordinator")) return "/coordinator/dashboard";

  if (hasRole(summary, "marker")) return "/marker/projects";

  // Assignments exist but every template is one this build doesn't know —
  // only reachable if the backend adds a sixth template. Terminal, not a loop.
  return "/unauthorized";
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
