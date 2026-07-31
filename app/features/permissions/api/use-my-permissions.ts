import { useQuery } from "@tanstack/react-query";
import { permissionsService } from "~/features/permissions/api/permissions.service";

export const myPermissionsQueryKey = ["my-permissions"] as const;

/**
 * The caller's own RBAC summary, through the query cache.
 *
 * ⚠️ This is **not** how the app gets its identity. `AuthProvider` calls
 * `permissionsService.getMyPermissions()` directly, because it has to own the
 * fetch's lifecycle relative to session bootstrap and token refresh (decision
 * #40) — a query hook can't hold `isBootstrapping` open, and `ProtectedRoute`
 * would flash-redirect before the summary landed.
 *
 * **Prefer `useAuth().permissions`.** This hook exists for a component that
 * genuinely wants a cache-backed, independently-refetchable copy; `enabled`
 * defaults to false so it never fires a duplicate request by accident.
 */
export function useMyPermissions(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: myPermissionsQueryKey,
    queryFn: permissionsService.getMyPermissions,
    enabled: options?.enabled ?? false,
  });
}
