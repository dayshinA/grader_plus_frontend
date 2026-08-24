import { useMemo } from "react";
import { useSearchParams } from "react-router";

import { useUnits } from "~/features/structure/api/use-structure";
import type { AcademicUnit } from "~/features/structure/types";

// The chosen unit lives in the URL, so "the modules in Science" is a link somebody can send.
export function useUnitScope() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading, isError, error, refetch, isFetching } = useUnits();

  const units = useMemo(() => data ?? [], [data]);

  const ordered = useMemo(() => {
    const schools = units
      .filter((unit) => unit.level === "school")
      .sort((a, b) => a.name.localeCompare(b.name));
    const ordered: { unit: AcademicUnit; nested: boolean }[] = [];

    for (const school of schools) {
      ordered.push({ unit: school, nested: false });
      for (const child of units
        .filter((unit) => unit.parentUnitId === school.id)
        .sort((a, b) => a.name.localeCompare(b.name))) {
        ordered.push({ unit: child, nested: true });
      }
    }

    // A caller scoped to one constituent unit never sees its parent, so add it to its own picker.
    for (const unit of units) {
      if (!ordered.some((entry) => entry.unit.id === unit.id)) {
        ordered.push({ unit, nested: false });
      }
    }

    return ordered;
  }, [units]);

  const fromUrl = searchParams.get("unit");
  const unitId = fromUrl && units.some((unit) => unit.id === fromUrl)
    ? fromUrl
    : (ordered[0]?.unit.id ?? "");

  const setUnitId = (next: string) => {
    setSearchParams((current) => {
      const params = new URLSearchParams(current);
      params.set("unit", next);
      // A different unit is a different list, so any page number on it is meaningless.
      params.delete("page");
      return params;
    });
  };

  return {
    unitId,
    setUnitId,
    unit: units.find((candidate) => candidate.id === unitId),
    units,
    ordered,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  };
}
