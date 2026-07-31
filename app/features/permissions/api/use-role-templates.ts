import { useQuery } from "@tanstack/react-query";
import { permissionsService } from "~/features/permissions/api/permissions.service";

export const roleTemplatesQueryKey = ["role-templates"] as const;

/**
 * The five role templates with their per-scope defaults, most senior first.
 * Needs `roles.view` — gate `enabled` on it for callers who might not hold it.
 *
 * Phase 2's delegation screen drives both its template picker and its scope
 * picker from this one response: `hierarchyLevel` for the Rule 2 filter,
 * `scopes[].scopeType` for which scopes a picked template may legally be held
 * at, and `scopes[].defaultPermissionKeys` to preview what a pick confers.
 */
export function useRoleTemplates(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: roleTemplatesQueryKey,
    queryFn: permissionsService.getRoleTemplates,
    enabled: options?.enabled ?? true,
  });
}
