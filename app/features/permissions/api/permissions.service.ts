import { api } from "~/lib/api-client";
import type {
  PermissionCatalogEntry,
  PermissionCategory,
  RoleTemplateCatalogEntry,
  UserPermissionsSummary,
} from "~/features/permissions/types";

/**
 * Raw RBAC introspection calls. Reads only — plain `api`, not `apiWithMessage`
 * (decision #31: the message-bearing variant is for mutations whose result the
 * UI echoes back to the user).
 *
 * The *write* side of RBAC (grant/revoke roles and extras) is a separate
 * domain, `features/role-assignments/`, built in Phase 2. This folder never
 * mutates anything.
 */
export const permissionsService = {
  /**
   * The caller's own roles and effective permissions. Requires only a valid
   * login — no permission gate — because it is the call every other gate
   * depends on.
   *
   * `AuthProvider` owns the calling of this (after login, on bootstrap
   * recovery, and on every token refresh — decision #40). Prefer reading
   * `useAuth().permissions` over calling this or `useMyPermissions` directly.
   */
  getMyPermissions: (): Promise<UserPermissionsSummary> =>
    api.get<UserPermissionsSummary>("/role-assignments/me"),

  /** The permission catalogue, for a delegation screen's extras picker. Needs `roles.view`. */
  getPermissionCatalogue: (
    category?: PermissionCategory,
  ): Promise<PermissionCatalogEntry[]> =>
    api.get<PermissionCatalogEntry[]>("/permissions", {
      params: category ? { category } : undefined,
    }),

  /** Role templates with per-scope defaults, most senior first. Needs `roles.view`. */
  getRoleTemplates: (): Promise<RoleTemplateCatalogEntry[]> =>
    api.get<RoleTemplateCatalogEntry[]>("/role-templates"),
};
