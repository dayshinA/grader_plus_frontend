import { useState } from "react";
import { Link, NavLink, Outlet, useParams } from "react-router";
import { Repeat } from "lucide-react";

import { BackLink } from "~/components/ui/back-link";
import { Button } from "~/components/ui/button";
import { PageHeader } from "~/components/ui/page-header";
import { Skeleton } from "~/components/ui/skeleton";
import { useAuth } from "~/features/auth/api/auth-context";
import { can } from "~/features/access/permissions";
import { useUnits } from "~/features/structure/api/use-structure";
import { OfferingRolloverDialog } from "~/features/structure/components/offering-rollover-dialog";
import { UNIT_NAV } from "~/features/dashboard/nav";
import { ACADEMIC_UNIT_LEVEL_LABELS } from "~/features/structure/types";
import { backTo, useDeclaredBackTarget } from "~/hooks/use-back-link";
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
  // Moving between tabs is a navigation like any other, so the trail has to be handed
  // along or the back link degrades to its fallback on the first tab click.
  const declaredBack = useDeclaredBackTarget();
  const { data: units, isPending } = useUnits();
  const [rolloverOpen, setRolloverOpen] = useState(false);

  const unit = units?.find((candidate) => candidate.id === unitId);
  const parent = unit?.parentUnitId
    ? units?.find((candidate) => candidate.id === unit.parentUnitId)
    : undefined;
  const tabs = UNIT_NAV.filter((item) => can(grants, item.permission));

  return (
    <div className="space-y-6">
      <BackLink />

      {isPending && !unit ? (
        <Skeleton className="h-16 rounded-xl" />
      ) : (
        <div className="space-y-2">
          <PageHeader
            title={unit?.name ?? "Academic unit"}
            description={
              unit
                ? `${ACADEMIC_UNIT_LEVEL_LABELS[unit.level]}${unit.code ? ` · ${unit.code}` : ""}`
                : "This unit is not in the list your account can see, which usually means your roles do not cover it."
            }
            actions={
              unit &&
              can(grants, "offering.create") && (
                <Button
                  variant="outline"
                  className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto"
                  onClick={() => setRolloverOpen(true)}
                >
                  <Repeat className="size-4" aria-hidden="true" />
                  Roll offerings forward
                </Button>
              )
            }
          />
          {unit && parent && (
            <p className="text-sm text-muted-foreground">
              Part of{" "}
              <Link
                to={`/units/${parent.id}/dashboard`}
                state={backTo({ to: `/units/${unitId}/dashboard`, label: unit.name })}
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                {parent.name}
              </Link>
            </p>
          )}
        </div>
      )}

      <nav aria-label="Unit sections" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex w-max min-w-full gap-1 border-b border-border">
          {tabs.map((tab) => (
            <li key={tab.id}>
              <NavLink
                to={`/units/${unitId}/${tab.segment}`}
                state={declaredBack ? backTo(declaredBack) : undefined}
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

      {rolloverOpen && unit && (
        <OfferingRolloverDialog
          open={rolloverOpen}
          onOpenChange={setRolloverOpen}
          unitId={unit.id}
          unitName={unit.name}
        />
      )}
    </div>
  );
}
