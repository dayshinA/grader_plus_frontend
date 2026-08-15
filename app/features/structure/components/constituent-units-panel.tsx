import { Link } from "react-router";
import { Building2, ChevronRight } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { useUnits } from "~/features/structure/api/use-structure";
import { ACADEMIC_UNIT_KIND_LABELS } from "~/features/structure/types";
import { backTo, useDeclaredBackTarget } from "~/hooks/use-back-link";

/**
 * The units that sit under a School, so somebody inside the School can reach a department
 * without going back out to the system wide unit list, which most of them cannot see.
 *
 * `GET /units` already returns the children of any School the caller can reach, so this is
 * a filter over the list the unit frame loaded rather than a request of its own. It renders
 * nothing at all for a constituent unit: there is no third level.
 */
export function ConstituentUnitsPanel({ unitId }: { unitId: string }) {
  const { data: units, isPending } = useUnits();
  const declaredBack = useDeclaredBackTarget();

  const unit = units?.find((candidate) => candidate.id === unitId);
  const children = (units ?? [])
    .filter((candidate) => candidate.parentUnitId === unitId)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (isPending && !unit) {
    return <Skeleton className="h-28 rounded-xl" />;
  }

  if (!unit || unit.level !== "school" || children.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Units in this School</CardTitle>
        <CardDescription>
          {children.length === 1
            ? "One unit sits under this School."
            : `${children.length} units sit under this School.`}{" "}
          The progress above already counts every offering beneath them.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 sm:grid-cols-2">
          {children.map((child) => (
            <li key={child.id}>
              <Link
                to={`/units/${child.id}/dashboard`}
                state={backTo({
                  to: `/units/${unitId}/dashboard`,
                  label: unit.name,
                  back: declaredBack,
                })}
                className="group flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/40 hover:bg-accent/50"
              >
                <Building2
                  className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{child.name}</span>
                    {child.code && (
                      <span className="font-mono text-xs text-muted-foreground">{child.code}</span>
                    )}
                    {!child.isActive && <Badge variant="outline">Deactivated</Badge>}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {ACADEMIC_UNIT_KIND_LABELS[child.unitKind]}
                  </span>
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
