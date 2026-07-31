import { useQuery } from "@tanstack/react-query";
import { permissionsService } from "~/features/permissions/api/permissions.service";
import type { PermissionCategory } from "~/features/permissions/types";

export const permissionCatalogueQueryKey = (category?: PermissionCategory) =>
  ["permission-catalogue", category ?? "all"] as const;

/**
 * The permission catalogue, optionally filtered to one category. Needs
 * `roles.view`, so `enabled` should be gated on that for anyone who might not
 * hold it — the endpoint 403s rather than returning an empty list.
 *
 * First real consumer is Phase 2's delegation screen (the extras picker, which
 * shows `functional` and `administrative` as two groups).
 */
export function usePermissionCatalogue(
  category?: PermissionCategory,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: permissionCatalogueQueryKey(category),
    queryFn: () => permissionsService.getPermissionCatalogue(category),
    enabled: options?.enabled ?? true,
  });
}
