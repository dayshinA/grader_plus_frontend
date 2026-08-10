import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";

import { useAcademicModules } from "~/features/academic-modules/api/use-academic-modules";
import type { AcademicModuleResponse } from "~/features/academic-modules/types";

export interface ModuleSelection {
  /** Every module this account can list. Empty while loading. */
  modules: AcademicModuleResponse[];
  /** The selected module's id, or null before the default lands. */
  moduleId: string | null;
  /** The selected module itself, resolved from the list. */
  selectedModule: AcademicModuleResponse | null;
  /** True once the list has resolved and holds nothing — a real, reachable state. */
  noModules: boolean;
  isLoading: boolean;
  onModuleChange: (id: string) => void;
}

/**
 * "Which module is this screen looking at?" — shared by every module-scoped screen
 * (Rubrics, Discrepancies, Grades).
 *
 * The selection lives in `?moduleId=` rather than component state so a screen is
 * linkable and survives a reload, and defaults to the caller's first accessible module
 * so the landing view is a populated screen rather than an empty picker.
 *
 * A 403 from `GET /academic-modules` is deliberately not surfaced here: under the RBAC
 * model a list endpoint 403s for a caller who holds nothing matching rather than
 * returning an empty 200 (decision #44), so it reaches the caller as `noModules` —
 * "nothing for you to look at", which is what it means — and each screen renders its
 * own empty state.
 *
 * `DashboardPage` predates this hook and still has the same logic inline; it wasn't
 * rewired when this was extracted (2026-08-10) because rewriting a working screen is a
 * riskier change than adding new ones.
 */
export function useModuleSelection(): ModuleSelection {
  const [searchParams, setSearchParams] = useSearchParams();
  const moduleId = searchParams.get("moduleId");

  const { data, isLoading } = useAcademicModules();
  const modules = useMemo(() => data ?? [], [data]);

  const onModuleChange = useCallback(
    (id: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("moduleId", id);
          // A different module is a different cohort — page 3 of the old one means
          // nothing here.
          next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Default to the first accessible module unless the URL already names one (a deep
  // link, or a selection made before a reload).
  useEffect(() => {
    if (moduleId || isLoading || modules.length === 0) return;
    onModuleChange(modules[0].id);
  }, [moduleId, isLoading, modules, onModuleChange]);

  const selectedModule = useMemo(
    () => modules.find((module) => module.id === moduleId) ?? null,
    [modules, moduleId],
  );

  return {
    modules,
    moduleId,
    selectedModule,
    noModules: !isLoading && modules.length === 0,
    isLoading,
    onModuleChange,
  };
}
