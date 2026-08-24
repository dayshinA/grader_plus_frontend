// Mirrors src/access: the four roles, the scope a grant is over, and the permission strings.

export const ROLES = ["system_admin", "unit_admin", "coordinator", "marker"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  system_admin: "System Administrator",
  unit_admin: "Unit Admin",
  coordinator: "Project Coordinator",
  marker: "Marker",
};

// Mirrors the backend's ROLE_RANK. One rule only: nobody grants at or above their own level.
export const ROLE_RANK: Record<Role, number> = {
  system_admin: 3,
  unit_admin: 2,
  coordinator: 1,
  marker: 0,
};

export const SCOPE_TYPES = ["system", "academic_unit", "module_offering"] as const;
export type ScopeType = (typeof SCOPE_TYPES)[number];

/** Which kind of scope each role pairs with. The server holds the same rule as a constraint. */
export const SCOPE_FOR_ROLE: Record<Role, ScopeType> = {
  system_admin: "system",
  unit_admin: "academic_unit",
  coordinator: "module_offering",
  marker: "module_offering",
};

export const PERMISSIONS = [
  "user.read",
  "user.create",
  "user.update",
  "user.deactivate",
  "role.read",
  "role.grant",
  "role.revoke",
  "unit.read",
  "unit.create",
  "unit.update",
  "programme.read",
  "programme.create",
  "programme.update",
  "module.read",
  "module.create",
  "module.update",
  "offering.read",
  "offering.create",
  "offering.update",
  "offering.close",
  "offering.reopen",
  "intake.upload",
  "project.read",
  "project.create",
  "project.update",
  "project.delete",
  "project.exclude",
  "submission.upload",
  "submission.read",
  "submission.delete",
  "rubric.read",
  "rubric.write",
  "assignment.read",
  "assignment.write",
  "marking.work",
  "discrepancy.read",
  "discrepancy.resolve",
  "grade.read",
  "grade.override",
  "dashboard.read",
  "platform.read",
  "export.run",
  "audit.read",
  "audit.read_scoped",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

// One row of `GET /me/permissions`. Capability is the union, so nothing branches on `role`.
export interface ResolvedGrant {
  role: Role;
  scopeType: ScopeType;
  scopeId: string | null;
  permissions: Permission[];
}

// Narrowed to the scopes the caller reaches. Active only, so `revokedAt` is always null here.
export interface RoleAssignment {
  id: string;
  userId: string;
  role: Role;
  scopeType: ScopeType;
  scopeId: string | null;
  grantedBy: string;
  grantedAt: string;
  revokedAt: string | null;
}

export interface GrantRolePayload {
  role: Role;
  scopeType: ScopeType;
  /** Omitted only for system_admin. */
  scopeId?: string;
}
