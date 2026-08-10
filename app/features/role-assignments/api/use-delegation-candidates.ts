import { useMemo } from "react";
import { useAuth } from "~/features/auth/api/auth-context";
import { useDepartmentCoordinators } from "~/features/departments/api/use-department-coordinators";
import { hasPermission, hasRole } from "~/features/permissions/utils";
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
 * `GET /users` needs `users.view`, and not every grantor holds it. **Corrected
 * 2026-08-10:** this used to say only Super Admin does — true when written on
 * 2026-07-31, wrong since the backend's 2026-08-03 least-privilege redesign,
 * which gave both the School Admin and Department Admin templates
 * `users.view`/`users.update` (School Admin also `users.deactivate`). The
 * branch below has always been driven by `hasPermission`, not by a role name,
 * so the behaviour was right throughout — only this comment was stale.
 *
 * Who lands in which branch today (`backend_verified_RBAC.txt` §8):
 * System Administrator, School Admin and Department Admin hold `users.view`
 * and get `GET /users`; a module-scoped Project Coordinator holds
 * `roles.assign` and `users.create` but not `users.view`, so they fall back to
 * `GET /schools/:id/coordinators` / `GET /departments/:id/coordinators`.
 *
 * ## The gap this leaves, stated plainly
 *
 * Two different shapes of gap, depending on the branch.
 *
 * **Coordinators-only branch:** those endpoints return **only users who already
 * hold Project Coordinator** (`findCoordinators` filters on the role template),
 * so the grantor can re-delegate among existing Coordinators but cannot pick a
 * plain account to make into a Marker. The screen says so (`isCoordinatorsOnly`
 * drives an inline note) rather than silently showing a short list.
 *
 * **`GET /users` branch:** the list is self-filtered server-side
 * (`UsersService.findAll`) to users whose active assignments fall inside the
 * caller's own administered scopes — so a School Admin sees their school's
 * people, not the platform's, and an account holding no assignment at all is
 * invisible to them. Narrower than it looks, and not currently noted on screen.
 *
 * Either way, staffing someone from scratch goes through `POST /users` with a
 * bundled assignment — CH-11, Phase 3.
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
  // `UsersService.findAll` branches on exactly this: System Administrator gets every account,
  // everyone else gets only users whose active assignments fall inside their own administered
  // scopes. Role identity rather than a capability because the backend's own branch is role
  // identity — mirroring it is what makes the on-screen note true (see `isScopeFiltered`).
  const listsEveryUser = hasRole(summary, "system_administrator");

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
    /**
     * True when the list came from `GET /users` but was self-filtered server-side to the
     * caller's own scopes — a School or Department Admin. Also drives an inline note: the
     * picker looks like "every user" and isn't, and an account holding no role at all is
     * invisible to them, which is exactly the person they'd be trying to staff from scratch.
     */
    isScopeFiltered: canListUsers && !listsEveryUser,
    isLoading: activeQuery.isLoading,
    isError: activeQuery.isError,
  };
}
