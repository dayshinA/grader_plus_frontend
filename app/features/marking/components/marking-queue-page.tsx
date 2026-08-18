import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, CircleCheck, CircleDashed, CircleDot, PenLine } from "lucide-react";

import { Badge } from "~/components/ui/badge";
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
import { ListToolbar } from "~/components/ui/list-toolbar";
import { PageHeader } from "~/components/ui/page-header";
import { Skeleton } from "~/components/ui/skeleton";
import { useMarkingQueue } from "~/features/marking/api/use-marking";
import { QUEUE_STATE_LABELS, type QueueState } from "~/features/marking/types";
import { formatDate, formatDateTime, pluralise } from "~/utils/format";
import { cn } from "~/lib/utils";

type Filter = "outstanding" | "all" | "submitted";

const FILTERS: FilterTabOption<Filter>[] = [
  { id: "outstanding", label: "Outstanding" },
  { id: "submitted", label: "Submitted" },
  { id: "all", label: "All" },
];

const STATE_STYLE: Record<QueueState, string> = {
  not_started: "text-muted-foreground",
  draft: "text-amber-600 dark:text-amber-400",
  final: "text-green-600 dark:text-green-400",
};

function StateIcon({ state }: { state: QueueState }) {
  const Icon = state === "final" ? CircleCheck : state === "draft" ? CircleDot : CircleDashed;
  return <Icon className={cn("size-4 shrink-0", STATE_STYLE[state])} aria-hidden="true" />;
}

/**
 * What this marker still owes, and nothing else.
 *
 * Must not render: any other marker, any total but their own, any discrepancy or moderation
 * signal, any hint that a project is contested. None of that is in the response, and none of
 * it is manufactured here either.
 */
export function MarkingQueuePage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useMarkingQueue();

  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<Filter | null>(null);
  const allSubmitted = Boolean(
    data && data.length > 0 && data.every((item) => item.myStatus === "final"),
  );
  const filter = selectedFilter ?? (allSubmitted ? "all" : "outstanding");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((item) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "submitted" && item.myStatus === "final") ||
        (filter === "outstanding" && item.myStatus !== "final");
      const matchesTerm =
        !term ||
        `${item.studentName} ${item.title} ${item.moduleCode}`.toLowerCase().includes(term);
      return matchesFilter && matchesTerm;
    });
  }, [data, search, filter]);

  const outstanding = (data ?? []).filter((item) => item.myStatus !== "final").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My marking"
        description={
          data
            ? outstanding === 0
              ? "Everything you were given has been submitted."
              : `${pluralise(outstanding, "project")} still waiting on you.`
            : "The projects you were given, and how far you have got with each."
        }
      />

      {isError ? (
        <ErrorCard
          title="Could not load your queue"
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      ) : (
        <>
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchLabel="Search your queue by student, title or module"
            placeholder="Search your queue"
            filters={
              <FilterTabs
                options={FILTERS}
                value={filter}
                onChange={setSelectedFilter}
                label="Filter your queue"
              />
            }
          />

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-4">
                <Empty className="px-0">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <PenLine aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>
                      {search
                        ? "No projects match"
                        : filter === "submitted"
                          ? "Nothing submitted yet"
                          : filter === "outstanding"
                            ? "Nothing outstanding"
                            : "No projects assigned"}
                    </EmptyTitle>
                    <EmptyDescription>
                      {search
                        ? "Try a different search term."
                        : filter === "all"
                          ? "Nobody has assigned you a project to mark. A coordinator does that once their offering has projects and a rubric."
                          : filter === "outstanding"
                            ? "You have submitted everything you were given. You can still go back and change a submission if you need to."
                            : "You have not submitted any of these yet."}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-3">
              {filtered.map((item) => (
                <li key={item.projectId}>
                  <Card>
                    <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <StateIcon state={item.myStatus} />
                          <p className="truncate font-medium">{item.studentName}</p>
                          <Badge variant="outline">{item.moduleCode}</Badge>
                          {item.offeringStatus === "closed" && (
                            <Badge variant="secondary">Closed</Badge>
                          )}
                        </div>
                        <p className="truncate text-sm text-muted-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {QUEUE_STATE_LABELS[item.myStatus]}
                          {item.mySubmittedAt && ` ${formatDateTime(item.mySubmittedAt)}`}
                          {item.markingDeadline &&
                            ` · deadline ${formatDate(item.markingDeadline)}`}
                        </p>
                      </div>

                      <Button
                        asChild
                        variant={item.myStatus === "final" ? "outline" : "default"}
                        className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto"
                      >
                        <Link to={`/marking/${item.projectId}`}>
                          {item.myStatus === "not_started"
                            ? "Start marking"
                            : item.myStatus === "draft"
                              ? "Continue"
                              : "Review"}
                          <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
