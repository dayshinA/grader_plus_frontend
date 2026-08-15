import type { Permission, ResolvedGrant, Role, ScopeType } from "~/features/access/types";

/**
 * Reading a permission set. Every helper here answers a question about what the caller
 * holds, never about which role they are: one person can hold several roles at once and
 * their capability is the union of all of them.
 *
 * `permissionKeys` is a coarse gate that ignores scope, so a screen rendering a button
 * from it still has to handle a 403 on the request. A hidden button is not a boundary.
 */

export function can(grants: ResolvedGrant[], permission: Permission): boolean {
  return grants.some((grant) => grant.permissions.includes(permission));
}

export function canAny(grants: ResolvedGrant[], permissions: Permission[]): boolean {
  return permissions.some((permission) => can(grants, permission));
}

/**
 * Whether the caller holds the permission on this specific scope. Useful for narrowing a
 * list to what is worth showing; the server still decides.
 */
export function canOnScope(
  grants: ResolvedGrant[],
  permission: Permission,
  scopeType: ScopeType,
  scopeId: string,
): boolean {
  return grants.some(
    (grant) =>
      grant.permissions.includes(permission) &&
      (grant.scopeType === "system" ||
        (grant.scopeType === scopeType && grant.scopeId === scopeId)),
  );
}

export function isSystemWide(grants: ResolvedGrant[]): boolean {
  return grants.some((grant) => grant.scopeType === "system");
}

/** The scope ids the caller holds a given role over, deduplicated. */
export function scopeIdsFor(grants: ResolvedGrant[], role: Role): string[] {
  return [
    ...new Set(
      grants
        .filter((grant) => grant.role === role && grant.scopeId !== null)
        .map((grant) => grant.scopeId as string),
    ),
  ];
}

/** Every offering the caller holds any grant on, coordinator or marker alike. */
export function offeringIds(grants: ResolvedGrant[]): string[] {
  return [
    ...new Set(
      grants
        .filter((grant) => grant.scopeType === "module_offering" && grant.scopeId !== null)
        .map((grant) => grant.scopeId as string),
    ),
  ];
}

export function unitIds(grants: ResolvedGrant[]): string[] {
  return [
    ...new Set(
      grants
        .filter((grant) => grant.scopeType === "academic_unit" && grant.scopeId !== null)
        .map((grant) => grant.scopeId as string),
    ),
  ];
}

/** Everything the caller can do, flattened. For the account screen's summary. */
export function allPermissions(grants: ResolvedGrant[]): Permission[] {
  return [...new Set(grants.flatMap((grant) => grant.permissions))].sort();
}
