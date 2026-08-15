import { NavLink, Outlet, useParams } from "react-router";

import { PageHeader } from "~/components/ui/page-header";
import { Skeleton } from "~/components/ui/skeleton";
import { useAuth } from "~/features/auth/api/auth-context";
import { can } from "~/features/access/permissions";
import { useUnits } from "~/features/structure/api/use-structure";
import { UNIT_NAV } from "~/features/dashboard/nav";
import { ACADEMIC_UNIT_LEVEL_LABELS } from "~/features/structure/types";
import { cn } from "~/lib/utils";

/**
 * The chrome for one academic unit. Scope is the difference between a School and a
 * constituent unit, not the screens, so this frame is identical either way and the server
 * decides what is behind each tab.
 *
 * Unit create and edit are absent here rather than present and refused: the structure comes
 * from University governance and a unit admin does not redraw it.
 */
export function UnitLayout() {
  const { unitId = "" } = useParams();
  const { grants } = useAuth();
  const { data: units, isPending } = useUnits();

  const unit = units?.find((candidate) => candidate.id === unitId);
  const tabs = UNIT_NAV.filter((item) => can(grants, item.permission));

  return (
    <div className="space-y-6">
      {isPending && !unit ? (
        <Skeleton className="h-16 rounded-xl" />
      ) : (
        <PageHeader
          title={unit?.name ?? "Academic unit"}
          description={
            unit
              ? `${ACADEMIC_UNIT_LEVEL_LABELS[unit.level]}${unit.code ? ` · ${unit.code}` : ""}`
              : "This unit is not in the list your account can see, which usually means it is out of scope."
          }
        />
      )}

      <nav aria-label="Unit sections" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex w-max min-w-full gap-1 border-b border-border">
          {tabs.map((tab) => (
            <li key={tab.id}>
              <NavLink
                to={`/units/${unitId}/${tab.segment}`}
                className={({ isActive }) =>
                  cn(
                    "-mb-px block whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors",
                    isActive
                      ? "border-primary font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )
                }
              >
                {tab.title}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <Outlet />
    </div>
  );
}
