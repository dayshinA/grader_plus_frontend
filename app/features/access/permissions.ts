import { ROLE_RANK, ROLES } from "~/features/access/types";
import type { Permission, ResolvedGrant, Role, ScopeType } from "~/features/access/types";

// What the caller holds, never which role. Scope is ignored, so a screen still handles a 403.

export function can(grants: ResolvedGrant[], permission: Permission): boolean {
  return grants.some((grant) => grant.permissions.includes(permission));
}

export function canAny(grants: ResolvedGrant[], permissions: Permission[]): boolean {
  return permissions.some((permission) => can(grants, permission));
}

/** Whether the caller holds the permission on this scope. The server still decides. */
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

export function scopeIdsFor(grants: ResolvedGrant[], role: Role): string[] {
  return [
    ...new Set(
      grants
        .filter((grant) => grant.role === role && grant.scopeId !== null)
        .map((grant) => grant.scopeId as string),
    ),
  ];
}

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

export function allPermissions(grants: ResolvedGrant[]): Permission[] {
  return [...new Set(grants.flatMap((grant) => grant.permissions))].sort();
}

// The backend refuses a role at or above the caller's own, so offering one wastes a form.
export function grantableRoles(grants: ResolvedGrant[]): Role[] {
  if (grants.some((grant) => grant.role === "system_admin")) {
    return [...ROLES];
  }

  const highest = grants.reduce((rank, grant) => Math.max(rank, ROLE_RANK[grant.role]), -1);
  return ROLES.filter((role) => ROLE_RANK[role] < highest);
}
