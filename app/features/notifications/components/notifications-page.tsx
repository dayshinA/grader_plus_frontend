import { useState } from "react";
import {
  Bell,
  CalendarClock,
  CheckCheck,
  KeyRound,
  Scale,
  UserPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { ErrorCard } from "~/components/ui/error-card";
import { FilterTabs, type FilterTabOption } from "~/components/ui/filter-tabs";
import { PageHeader } from "~/components/ui/page-header";
import { Skeleton } from "~/components/ui/skeleton";
import {
  useMarkNotificationRead,
  useNotifications,
} from "~/features/notifications/api/use-notifications";
import type { Notification, NotificationType } from "~/features/notifications/types";
import { formatDateTime } from "~/utils/format";
import { cn } from "~/lib/utils";

/** The type is a label the frontend picks an icon from. Nothing branches on it. */
const ICONS: Record<NotificationType, LucideIcon> = {
  marker_assigned: Users,
  deadline_approaching: CalendarClock,
  discrepancy_opened: Scale,
  discrepancy_moved: Scale,
  discrepancy_resolved: Scale,
  password_reset: KeyRound,
  account_created: UserPlus,
};

type Filter = "all" | "unread";

const FILTERS: FilterTabOption<Filter>[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
];

function NotificationRow({ notification }: { notification: Notification }) {
  const markRead = useMarkNotificationRead();
  const Icon = ICONS[notification.type] ?? Bell;
  const unread = notification.readAt === null;

  return (
    <li
      className={cn(
        "flex gap-3 rounded-xl border p-4 transition-colors",
        unread ? "border-primary/30 bg-accent/40" : "border-border bg-card",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          unread ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-4" />
      </span>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="font-medium">{notification.subject}</p>
          {unread && <span className="sr-only">Unread</span>}
        </div>
        {/* Rendered as sent. A notification is never enriched by fetching what it mentions. */}
        <p className="text-sm text-muted-foreground">{notification.message}</p>
        <p className="text-xs text-muted-foreground">{formatDateTime(notification.createdAt)}</p>
      </div>

      {unread && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 shrink-0 cursor-pointer self-start"
          disabled={markRead.isPending}
          onClick={() => markRead.mutate(notification.id)}
        >
          <CheckCheck className="size-4" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Mark read</span>
        </Button>
      )}
    </li>
  );
}

export function NotificationsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const { data, isLoading, isError, error, refetch, isFetching } = useNotifications(
    filter === "unread",
  );

  const notifications = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Assignments, deadlines and outcomes, newest first."
      />

      <FilterTabs
        options={FILTERS}
        value={filter}
        onChange={setFilter}
        label="Filter notifications"
      />

      {isError ? (
        <ErrorCard
          title="Could not load your notifications"
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      ) : isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-4">
            <Empty className="px-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Bell aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>
                  {filter === "unread" ? "Nothing unread" : "No notifications yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {filter === "unread"
                    ? "You have read everything GraderPlus has sent you."
                    : "GraderPlus writes here when you are assigned work, when a deadline is close, and when a project you marked is settled."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {notifications.map((notification) => (
            <NotificationRow key={notification.id} notification={notification} />
          ))}
        </ul>
      )}
    </div>
  );
}
