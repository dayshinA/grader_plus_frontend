import { Link } from "react-router";
import { ArrowRight, Building2, ClipboardList, PenLine, ShieldQuestion } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { ErrorCard } from "~/components/ui/error-card";
import { PageHeader } from "~/components/ui/page-header";
import { Skeleton } from "~/components/ui/skeleton";
import { AUDIT_HIDDEN } from "~/features/audit/visibility";
import { useAuth } from "~/features/auth/api/auth-context";
import { useHome } from "~/features/dashboard/api/use-dashboard";
import { OfferingStatusBadge } from "~/features/structure/components/offering-status-badge";
import { ACADEMIC_UNIT_LEVEL_LABELS } from "~/features/structure/types";
import { backTo } from "~/hooks/use-back-link";

/**
 * Role aware, but not role branched: the response is already shaped for whoever asked, so
 * this screen renders what it is given.
 *
 * No total appears anywhere on it, including the caller's own.
 */
export function HomePage() {
  const { user, session, grants } = useAuth();
  const { data, isLoading, isError, error, refetch, isFetching } = useHome();

  const firstName = (user?.fullName ?? session?.fullName ?? "").split(" ")[0];

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Home" />
        <ErrorCard
          title="Could not load your home screen"
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Home" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    );
  }

  const hasNothing =
    grants.length === 0 &&
    data.outstandingMarking === 0 &&
    data.coordinates.length === 0 &&
    data.administers.length === 0 &&
    !data.isSystemAdmin;

  if (hasNothing) {
    return (
      <div className="space-y-6">
        <PageHeader title={firstName ? `Hello, ${firstName}` : "Home"} />
        <Card>
          <CardContent className="py-4">
            <Empty className="px-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShieldQuestion aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No roles yet</EmptyTitle>
                <EmptyDescription>
                  Your account exists, but nobody has granted it a role. GraderPlus decides what
                  you see from the roles you hold, so there is nothing here until then. Ask the
                  administrator who set the account up.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={firstName ? `Hello, ${firstName}` : "Home"}
        description="What is waiting on you, across every role you hold."
      />

      {data.outstandingMarking > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <PenLine className="size-4 text-muted-foreground" aria-hidden="true" />
              Marking
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="text-2xl font-semibold tabular-nums text-foreground">
                {data.outstandingMarking}
              </span>{" "}
              {data.outstandingMarking === 1 ? "project is" : "projects are"} still waiting on
              you.
            </p>
            <Button asChild className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto">
              <Link to="/marking">
                Open my queue
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {data.coordinates.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            {data.coordinates.length === 1 ? "Offering you coordinate" : "Offerings you coordinate"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.coordinates.map((offering) => (
              <Link
                key={offering.offeringId}
                to={`/offerings/${offering.offeringId}`}
                state={backTo({ to: "/", label: "home" })}
                className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {offering.moduleCode}{" "}
                      <span className="text-muted-foreground">{offering.academicYear}</span>
                    </p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {offering.moduleTitle}
                    </p>
                  </div>
                  <ClipboardList
                    className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-3">
                  <OfferingStatusBadge status={offering.status} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {data.administers.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            {data.administers.length === 1 ? "Unit you administer" : "Units you administer"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.administers.map((unit) => (
              <Link
                key={unit.unitId}
                to={`/units/${unit.unitId}/dashboard`}
                state={backTo({ to: "/", label: "home" })}
                className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{unit.name}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {ACADEMIC_UNIT_LEVEL_LABELS[unit.level]}
                    </p>
                  </div>
                  <Building2
                    className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {data.isSystemAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              Platform administration
              <Badge variant="secondary">System</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="h-11 cursor-pointer sm:h-9">
              <Link to="/admin/overview">Overview</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 cursor-pointer sm:h-9">
              <Link to="/admin/units">Academic units</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 cursor-pointer sm:h-9">
              <Link to="/admin/users">Accounts</Link>
            </Button>
            {!AUDIT_HIDDEN && (
              <Button asChild variant="outline" className="h-11 cursor-pointer sm:h-9">
                <Link to="/admin/audit">Audit log</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {data.outstandingMarking === 0 &&
        data.coordinates.length === 0 &&
        data.administers.length === 0 &&
        !data.isSystemAdmin && (
          <Card>
            <CardContent className="py-4">
              <Empty className="px-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <PenLine aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>Nothing waiting on you</EmptyTitle>
                  <EmptyDescription>
                    You hold a role, but there is no marking outstanding and no offering or unit
                    on your account right now.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
