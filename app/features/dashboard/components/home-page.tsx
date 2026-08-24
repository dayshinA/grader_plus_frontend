import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  Bell,
  Building2,
  CalendarClock,
  CircleCheck,
  CircleDashed,
  CircleDot,
  ClipboardList,
  KeyRound,
  PenLine,
  Scale,
  ShieldQuestion,
  UserPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
import { useAuth } from "~/features/auth/api/auth-context";
import {
  useHome,
  useOfferingSnapshots,
  useUnitSnapshots,
} from "~/features/dashboard/api/use-dashboard";
import { PlatformHome } from "~/features/dashboard/components/platform-home";
import { useMarkingQueue } from "~/features/marking/api/use-marking";
import type { MarkingQueueItem, QueueState } from "~/features/marking/types";
import { QUEUE_STATE_LABELS } from "~/features/marking/types";
import { useNotifications } from "~/features/notifications/api/use-notifications";
import type { NotificationType } from "~/features/notifications/types";
import { OfferingStatusBadge } from "~/features/structure/components/offering-status-badge";
import { ACADEMIC_UNIT_LEVEL_LABELS } from "~/features/structure/types";
import { backTo } from "~/hooks/use-back-link";
import { formatDate, formatDateTime, formatNumber, pluralise } from "~/utils/format";
import { cn } from "~/lib/utils";

const QUEUE_STATE_STYLE: Record<QueueState, string> = {
  not_started: "text-muted-foreground",
  draft: "text-amber-600 dark:text-amber-400",
  final: "text-green-600 dark:text-green-400",
};

const NOTIFICATION_ICONS: Record<NotificationType, LucideIcon> = {
  marker_assigned: Users,
  deadline_approaching: CalendarClock,
  discrepancy_opened: Scale,
  discrepancy_moved: Scale,
  discrepancy_resolved: Scale,
  password_reset: KeyRound,
  account_created: UserPlus,
};

function QueueStateIcon({ state }: { state: QueueState }) {
  const Icon = state === "final" ? CircleCheck : state === "draft" ? CircleDot : CircleDashed;
  return <Icon className={cn("size-4 shrink-0", QUEUE_STATE_STYLE[state])} aria-hidden="true" />;
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-semibold tabular-nums">{formatNumber(value)}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function MiniBar({ done, total, label }: { done: number; total: number; label: string }) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={label}
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">
        {done}/{total}
      </span>
    </div>
  );
}

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function deadlineOrder(a: MarkingQueueItem, b: MarkingQueueItem) {
  if (!a.markingDeadline) return b.markingDeadline ? 1 : 0;
  if (!b.markingDeadline) return -1;
  return new Date(a.markingDeadline).getTime() - new Date(b.markingDeadline).getTime();
}

// Entry points from `GET /me/home`, filled in on the full pages' query keys. No total anywhere.
export function HomePage() {
  const { user, session, grants, can } = useAuth();
  const { data, isLoading, isError, error, refetch, isFetching } = useHome();

  const isMarker = can("marking.work");
  const queue = useMarkingQueue(isMarker);
  const unread = useNotifications(true);
  // Captured once on mount. "Overdue" does not need to tick while the screen is open.
  const [now] = useState(() => Date.now());

  const offeringIds = useMemo(
    () => data?.coordinates.map((offering) => offering.offeringId) ?? [],
    [data],
  );
  const unitIds = useMemo(() => data?.administers.map((unit) => unit.unitId) ?? [], [data]);
  const offeringSnapshots = useOfferingSnapshots(offeringIds);
  const unitSnapshots = useUnitSnapshots(unitIds);

  const firstName = (user?.fullName ?? session?.fullName ?? "").split(" ")[0];
  const greeting = firstName ? `${timeOfDayGreeting()}, ${firstName}` : timeOfDayGreeting();

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
        <PageHeader title={greeting} />
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

  const queueItems = queue.data ?? [];
  const drafts = queueItems.filter((item) => item.myStatus === "draft").length;
  const submitted = queueItems.filter((item) => item.myStatus === "final").length;
  const nextUp = queueItems
    .filter((item) => item.myStatus !== "final")
    .sort(deadlineOrder)
    .slice(0, 4);

  const showMarking = isMarker || data.outstandingMarking > 0;
  const unreadItems = unread.data ?? [];
  const hasRoleContent =
    showMarking || data.coordinates.length > 0 || data.administers.length > 0;
  const showMainColumn = hasRoleContent || !data.isSystemAdmin;

  return (
    <div className="space-y-6">
      <PageHeader
        title={greeting}
        description="What is waiting on you, across every role you hold."
      />

      {data.isSystemAdmin && !hasRoleContent && <PlatformHome />}

      <div className={cn("grid items-start gap-6", showMainColumn && "lg:grid-cols-3")}>
        <div className={cn("space-y-6 lg:col-span-2", !showMainColumn && "hidden")}>
          {showMarking && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <PenLine className="size-4 text-muted-foreground" aria-hidden="true" />
                  My marking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="grid grid-cols-3 gap-4 sm:max-w-xs sm:flex-1">
                    <Figure label="Outstanding" value={data.outstandingMarking} />
                    {queue.isLoading ? (
                      <>
                        <Skeleton className="h-12 w-16" />
                        <Skeleton className="h-12 w-16" />
                      </>
                    ) : (
                      !queue.isError && (
                        <>
                          <Figure label="In draft" value={drafts} />
                          <Figure label="Submitted" value={submitted} />
                        </>
                      )
                    )}
                  </div>
                  <Button asChild className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto">
                    <Link to="/marking">
                      Open my queue
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>

                {nextUp.length > 0 && (
                  <div className="space-y-2 border-t border-border pt-4">
                    <p className="text-xs font-medium text-muted-foreground">Next up</p>
                    <ul className="space-y-2">
                      {nextUp.map((item) => {
                        const overdue =
                          item.markingDeadline !== null &&
                          new Date(item.markingDeadline).getTime() < now;
                        return (
                          <li key={item.projectId}>
                            <Link
                              to={`/marking/${item.projectId}`}
                              state={backTo({ to: "/", label: "home" })}
                              className="flex items-center gap-3 rounded-lg border border-border p-2.5 transition-colors hover:border-primary/40 hover:bg-accent/50"
                            >
                              <QueueStateIcon state={item.myStatus} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{item.studentName}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {item.moduleCode} {item.academicYear} ·{" "}
                                  {QUEUE_STATE_LABELS[item.myStatus]}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "shrink-0 text-xs",
                                  overdue
                                    ? "font-medium text-amber-600 dark:text-amber-400"
                                    : "text-muted-foreground",
                                )}
                              >
                                {item.markingDeadline
                                  ? `${overdue ? "Overdue, " : "Due "}${formatDate(item.markingDeadline)}`
                                  : "No deadline"}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {isMarker &&
                  !queue.isLoading &&
                  !queue.isError &&
                  data.outstandingMarking === 0 && (
                    <p className="border-t border-border pt-4 text-sm text-muted-foreground">
                      Nothing outstanding. Everything assigned to you has been submitted.
                    </p>
                  )}
              </CardContent>
            </Card>
          )}

          {data.coordinates.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                {data.coordinates.length === 1
                  ? "Offering you coordinate"
                  : "Offerings you coordinate"}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.coordinates.map((offering) => {
                  const snapshot = offeringSnapshots.byId.get(offering.offeringId);
                  return (
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
                      <div className="mt-3 flex items-center gap-2">
                        <OfferingStatusBadge status={offering.status} />
                        {snapshot && snapshot.progress.openCases > 0 && (
                          <Badge variant="warning">
                            {pluralise(snapshot.progress.openCases, "open case")}
                          </Badge>
                        )}
                      </div>
                      {snapshot ? (
                        <div className="mt-3 space-y-1.5 border-t border-border pt-3">
                          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                            <span>Marked and settled</span>
                            <span>
                              {snapshot.offering.markingDeadline
                                ? `Due ${formatDate(snapshot.offering.markingDeadline)}`
                                : "No deadline"}
                            </span>
                          </div>
                          <MiniBar
                            done={snapshot.progress.graded}
                            total={snapshot.progress.projects}
                            label={`${snapshot.progress.graded} of ${snapshot.progress.projects} projects graded`}
                          />
                        </div>
                      ) : (
                        offeringSnapshots.isLoading && (
                          <div className="mt-3 space-y-1.5 border-t border-border pt-3">
                            <Skeleton className="h-3 w-32" />
                            <Skeleton className="h-1.5 w-full" />
                          </div>
                        )
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {data.administers.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                {data.administers.length === 1 ? "Unit you administer" : "Units you administer"}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.administers.map((unit) => {
                  const snapshot = unitSnapshots.byId.get(unit.unitId);
                  return (
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
                      {snapshot ? (
                        <div className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3">
                          <Figure label="Offerings" value={snapshot.totals.offerings} />
                          <Figure label="In marking" value={snapshot.totals.inMarking} />
                          <Figure label="Open cases" value={snapshot.totals.openCases} />
                        </div>
                      ) : (
                        unitSnapshots.isLoading && (
                          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3">
                            <Skeleton className="h-12 w-14" />
                            <Skeleton className="h-12 w-14" />
                            <Skeleton className="h-12 w-14" />
                          </div>
                        )
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {!showMarking &&
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
                        You hold a role, but there is no marking outstanding and no offering or
                        unit on your account right now.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </CardContent>
              </Card>
            )}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="size-4 text-muted-foreground" aria-hidden="true" />
              Unread notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {unread.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 rounded-lg" />
                <Skeleton className="h-14 rounded-lg" />
              </div>
            ) : unread.isError || unreadItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {unread.isError
                  ? "Notifications could not be loaded."
                  : "Nothing unread. Anything new lands here."}
              </p>
            ) : (
              <ul className="space-y-2">
                {unreadItems.slice(0, 4).map((notification) => {
                  const Icon = NOTIFICATION_ICONS[notification.type] ?? Bell;
                  return (
                    <li
                      key={notification.id}
                      className="flex gap-2.5 rounded-lg border border-border p-2.5"
                    >
                      <span
                        aria-hidden="true"
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{notification.subject}</p>
                        {/* Rendered as sent, never enriched by fetching what it mentions. */}
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDateTime(notification.createdAt)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <Button asChild variant="outline" className="h-11 w-full cursor-pointer sm:h-9">
              <Link to="/account/notifications">
                All notifications
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {data.isSystemAdmin && hasRoleContent && <PlatformHome />}
    </div>
  );
}
