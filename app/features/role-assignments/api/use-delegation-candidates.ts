import { useMemo } from "react";
import { useAuth } from "~/features/auth/api/auth-context";
import { useDepartmentCoordinators } from "~/features/departments/api/use-department-coordinators";
import { hasPermission } from "~/features/permissions/utils";
import { useSchoolCoordinators } from "~/features/schools/api/use-school-coordinators";
import { useUsers } from "~/features/users/api/use-users";

export interface DelegationCandidate {
  id: string;
  fullName: string;
  email: string;
  /** Undefined when sourced from a coordinators endpoint, which doesn't return it. */
  isActive?: boolean;
}

/**
 * Who the current grantor may pick as a delegation target — the dual-source
 * picker confirmed with Dayshin on 2026-07-31 (SYSTEM_DESIGN.md decision #42).
 *
 * ## Why there are two sources
 *
 * `GET /users` needs `users.view`. Reading the backend's
 * `ROLE_TEMPLATE_PERMISSION_DEFAULTS` on 2026-07-31, **only Super Admin holds
 * it** — the School Admin and Department Admin templates hold `roles.view`,
 * `roles.view_candidates` and `users.create`, but not `users.view`. So a School
 * Admin cannot enumerate accounts at all; the only candidate list they can read
 * is `GET /schools/:id/coordinators` / `GET /departments/:id/coordinators`.
 *
 * ## The gap this leaves, stated plainly
 *
 * Those endpoints return **only users who already hold Project Coordinator**
 * (`findCoordinators` filters on the role template). So a School or Department
 * Admin can re-delegate among existing Coordinators, but cannot pick a plain
 * account to make into a Marker. There is no endpoint that would let them.
 * Staffing someone from scratch goes through `POST /users` with a bundled
 * assignment — CH-11, Phase 3. The screen says so rather than silently showing
 * a short list.
 *
 * ## Why only one coordinators call
 *
 * Both coordinator endpoints return *every active coordinator system-wide* —
 * they're authorization-scoped, not data-scoped (see `CoordinatorResponse`'s
 * own comment, and `DepartmentsService.findCoordinators`). So one call against
 * any scope the grantor administers returns the whole list; there's nothing to
 * gain from fanning out across every scope they hold.
 */
export function useDelegationCandidates() {
  const { permissions: summary } = useAuth();
  const canListUsers = hasPermission(summary, "users.view");

  // The first school/department the grantor holds a role at — used purely to
  // satisfy the endpoints' path param, not to filter the result.
  const schoolScopeId = useMemo(
    () =>
      summary?.assignments.find((a) => a.scopeType === "school")?.scopeId ??
      undefined,
    [summary],
  );
  const departmentScopeId = useMemo(
    () =>
      summary?.assignments.find((a) => a.scopeType === "department")?.scopeId ??
      undefined,
    [summary],
  );

  const users = useUsers({ enabled: canListUsers });
  const schoolCoordinators = useSchoolCoordinators(
    canListUsers ? undefined : schoolScopeId,
  );
  const departmentCoordinators = useDepartmentCoordinators(
    canListUsers || schoolScopeId ? undefined : departmentScopeId,
  );

  const candidates = useMemo<DelegationCandidate[]>(() => {
    if (canListUsers) {
      return [...(users.data ?? [])]
        .map((user) => ({
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          isActive: user.isActive,
        }))
        .sort((a, b) => a.fullName.localeCompare(b.fullName));
    }

    return [...(schoolCoordinators.data ?? departmentCoordinators.data ?? [])].sort(
      (a, b) => a.fullName.localeCompare(b.fullName),
    );
  }, [canListUsers, users.data, schoolCoordinators.data, departmentCoordinators.data]);

  const activeQuery = canListUsers
    ? users
    : schoolScopeId
      ? schoolCoordinators
      : departmentCoordinators;

  return {
    candidates,
    /** True when the list is existing Coordinators only — drives the inline note. */
    isCoordinatorsOnly: !canListUsers,
    isLoading: activeQuery.isLoading,
    isError: activeQuery.isError,
  };
}
