import { useMemo } from "react";
import { useAuth } from "~/features/auth/api/auth-context";
import type { ScopeType, UserPermissionsSummary } from "~/features/permissions/types";
import { useAcademicModules } from "~/features/academic-modules/api/use-academic-modules";
import { useDepartments } from "~/features/departments/api/use-departments";
import { useSchools } from "~/features/schools/api/use-schools";
import {
  containingAssignments,
  resolveScopeChain,
  SCOPE_TYPE_LABELS,
  type ScopeAncestrySources,
} from "~/features/role-assignments/utils";

export interface ScopeOption {
  id: string;
  label: string;
  /** True when the name couldn't be resolved and the label is a fallback — see below. */
  isUnnamed?: boolean;
}

/**
 * Everything `ScopePicker` needs: the org lists, the ancestry sources derived
 * from them, and the scope options the current grantor may actually target.
 *
 * ## Why this isn't just "render `GET /departments`"
 *
 * Two constraints the naive version gets wrong.
 *
 * **1. Not every grantor can read every list.** Reading
 * `ROLE_TEMPLATE_PERMISSION_DEFAULTS` on 2026-07-31: the Department Admin
 * template holds `schools.view` and `modules.view` but **not** `departments.view`
 * — so `GET /departments` 403s for them, and a picker built on it alone would
 * be empty for exactly the person most likely to be delegating. Each query is
 * therefore treated as optional: an error leaves that list undefined and the
 * options fall back to the grantor's own assignment scopes, which
 * `/role-assignments/me` always provides.
 *
 * **2. A list is not a permission.** `GET /schools` and `GET /academic-modules`
 * self-filter, but not identically to what the grantor may *delegate* at. So
 * every candidate is containment-checked against the grantor's own assignments
 * before being offered, which is the same test Rule 2 applies server-side.
 *
 * ## The unnamed-scope fallback
 *
 * A Department Admin can't resolve their own department's *name* through any
 * endpoint they can call — `GET /departments` and `GET /departments/:id` both
 * need permissions their template lacks. Rather than print a raw UUID, such an
 * option is labelled from its scope type ("Your department") and flagged
 * `isUnnamed` so the picker can note why. Logged as a known gap rather than
 * papered over.
 */
export function useScopeOptions() {
  const { permissions: summary } = useAuth();

  // Each of these can legitimately 403 depending on who's asking — see above.
  // `isError` is read rather than thrown on; an unreadable list is a narrower
  // picker, not a broken screen.
  const schools = useSchools();
  const departments = useDepartments();
  const modules = useAcademicModules();

  const sources = useMemo<ScopeAncestrySources>(
    () => ({ departments: departments.data, modules: modules.data }),
    [departments.data, modules.data],
  );

  const optionsByScopeType = useMemo(() => {
    const build = (
      scopeType: Exclude<ScopeType, "global">,
      known: readonly { id: string; name: string }[] | undefined,
    ): ScopeOption[] => {
      const namesById = new Map(known?.map((item) => [item.id, item.name]));

      // Candidates the grantor can see AND legitimately act at...
      const fromLists = (known ?? [])
        .filter((item) =>
          containingAssignments(
            summary,
            resolveScopeChain(scopeType, item.id, sources),
          ).length > 0,
        )
        .map((item) => ({ id: item.id, label: item.name }));

      // ...unioned with the scopes they hold directly, which are always
      // targetable and are the only source available when the list 403s.
      const fromOwnAssignments = ownScopeIds(summary, scopeType)
        .filter((id) => !fromLists.some((option) => option.id === id))
        .map((id) => ({
          id,
          label: namesById.get(id) ?? `Your ${SCOPE_TYPE_LABELS[scopeType].toLowerCase()}`,
          isUnnamed: !namesById.has(id),
        }));

      return [...fromLists, ...fromOwnAssignments].sort((a, b) =>
        a.label.localeCompare(b.label),
      );
    };

    return {
      school: build("school", schools.data),
      department: build("department", departments.data),
      module: build("module", modules.data),
    };
  }, [summary, sources, schools.data, departments.data, modules.data]);

  /**
   * Global is only offerable by someone holding a global assignment — in
   * practice a Super Admin. Anyone else picking it would be rejected by Rule 2
   * anyway, since nothing they hold contains global scope.
   */
  const canTargetGlobal = useMemo(
    () => (summary?.assignments ?? []).some((a) => a.scopeType === "global"),
    [summary],
  );

  return {
    sources,
    optionsByScopeType,
    canTargetGlobal,
    isLoading: schools.isLoading || departments.isLoading || modules.isLoading,
  };
}

/** The distinct scope ids the grantor holds an assignment at, for one scope type. */
function ownScopeIds(
  summary: UserPermissionsSummary | null,
  scopeType: ScopeType,
): string[] {
  const ids = new Set<string>();
  for (const assignment of summary?.assignments ?? []) {
    if (assignment.scopeType === scopeType && assignment.scopeId) {
      ids.add(assignment.scopeId);
    }
  }
  return [...ids];
}
