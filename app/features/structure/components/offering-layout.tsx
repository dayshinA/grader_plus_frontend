import { NavLink, Outlet, useParams } from "react-router";
import { Lock } from "lucide-react";

import { BackLink } from "~/components/ui/back-link";
import { Callout } from "~/components/ui/callout";
import { PageHeader } from "~/components/ui/page-header";
import { Skeleton } from "~/components/ui/skeleton";
import { can } from "~/features/access/permissions";
import { useAuth } from "~/features/auth/api/auth-context";
import { OFFERING_NAV } from "~/features/dashboard/nav";
import { useOfferingHeader } from "~/features/structure/api/use-offering-header";
import { OfferingStatusBadge } from "~/features/structure/components/offering-status-badge";
import { formatDate, formatRelativeDays } from "~/utils/format";
import { backTo, useDeclaredBackTarget } from "~/hooks/use-back-link";
import { cn } from "~/lib/utils";

/**
 * The frame around one offering. The surface is stage ordered, so the tabs stay in the
 * order the work happens: intake and the rubric come before assignments, and grades and
 * export come last.
 *
 * A closed offering is the freeze, and it is said once here rather than repeated as a
 * generic failure on each screen underneath.
 */
export function OfferingLayout() {
  const { offeringId = "" } = useParams();
  const { grants } = useAuth();
  // The tabs are the same navigation the unit frame does: hand the trail along, or opening
  // intake from an offering opened from a unit loses the unit.
  const declaredBack = useDeclaredBackTarget();
  const { offering, isPending, isError } = useOfferingHeader(offeringId);

  const tabs = OFFERING_NAV.filter((item) => can(grants, item.permission));

  return (
    <div className="space-y-6">
      <BackLink />

      {isPending && !offering ? (
        <Skeleton className="h-16 rounded-xl" />
      ) : (
        <PageHeader
          title={offering ? `Offering ${offering.academicYear}` : "Offering"}
          description={
            offering
              ? `Deadline ${formatDate(offering.markingDeadline)} · ${formatRelativeDays(offering.daysToDeadline)} · discrepancy threshold ${offering.discrepancyThreshold}%`
              : isError
                ? "This offering is not one your account holds a role on, or it does not exist."
                : undefined
          }
          actions={offering && <OfferingStatusBadge status={offering.status} />}
        />
      )}

      {offering?.isClosed && (
        <Callout
          variant="warning"
          title="This offering is closed"
          icon={<Lock className="size-4" />}
        >
          The grades are frozen. Every write on it is refused from here on, which is what
          closing is for. Reopening is a separate permission most coordinators do not hold.
        </Callout>
      )}

      <nav aria-label="Offering sections" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex w-max min-w-full gap-1 border-b border-border">
          {tabs.map((tab) => (
            <li key={tab.id}>
              <NavLink
                to={
                  tab.segment
                    ? `/offerings/${offeringId}/${tab.segment}`
                    : `/offerings/${offeringId}`
                }
                end={tab.segment === ""}
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
    </div>
  );
}
