import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Scale } from "lucide-react";

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
import { Skeleton } from "~/components/ui/skeleton";
import { useDiscrepancies } from "~/features/grading/api/use-grading";
import { useOfferingHeader } from "~/features/structure/api/use-offering-header";
import { backTo } from "~/hooks/use-back-link";
import { formatDateTime, pluralise } from "~/utils/format";

type Filter = "open" | "resolved" | "all";

const FILTERS: FilterTabOption<Filter>[] = [
  { id: "open", label: "Open" },
  { id: "resolved", label: "Resolved" },
  { id: "all", label: "All" },
];

/**
 * Where two markers landed further apart than the offering's threshold.
 *
 * This list is coordinator facing only. A marker is never told a case exists, because the
 * existence of one says somebody disagreed with them.
 */
export function DiscrepanciesPage({ offeringId }: { offeringId: string }) {
  const { offering } = useOfferingHeader(offeringId);
  const { data, isLoading, isError, error, refetch, isFetching } = useDiscrepancies(offeringId);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("open");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((row) => {
      const matchesFilter = filter === "all" || row.status === filter;
      const matchesTerm = !term || row.studentName.toLowerCase().includes(term);
      return matchesFilter && matchesTerm;
    });
  }, [data, search, filter]);

  const open = (data ?? []).filter((row) => row.status === "open").length;
  const backHere = backTo({
    to: `/offerings/${offeringId}/discrepancies`,
    label: "discrepancies",
  });

  if (isError) {
    return (
      <ErrorCard
        title="Could not load discrepancies"
        error={error}
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {open === 0
          ? "Nothing is waiting on you."
          : `${pluralise(open, "case")} waiting on you.`}{" "}
        A case opens when two markers land more than{" "}
        {offering ? `${offering.discrepancyThreshold}%` : "the threshold"} apart, and only you
        can settle it.
      </p>

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchLabel="Search cases by student name"
        placeholder="Search cases"
        filters={
          <FilterTabs
            options={FILTERS}
            value={filter}
            onChange={setFilter}
            label="Filter cases"
          />
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-4">
            <Empty className="px-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Scale aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>
                  {search
                    ? "No cases match"
                    : filter === "open"
                      ? "No open cases"
                      : filter === "resolved"
                        ? "Nothing settled yet"
                        : "No cases at all"}
                </EmptyTitle>
                <EmptyDescription>
                  {search
                    ? "Try a different name."
                    : filter === "open"
                      ? "Either the markers agreed, or nobody has finished a project yet. A case opens on its own the moment a second marker submits and the spread is over the threshold."
                      : "Cases appear here once you have settled them, with what you decided and why."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {filtered.map((row) => (
            <li key={row.id}>
              <Card>
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{row.studentName}</p>
                      {row.status === "open" ? (
                        <Badge variant="warning">Open</Badge>
                      ) : (
                        <Badge variant="success">Settled</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {row.spread} points apart · opened {formatDateTime(row.openedAt)}
                      {row.resolvedAt && ` · settled ${formatDateTime(row.resolvedAt)}`}
                    </p>
                  </div>

                  <Button
                    asChild
                    variant={row.status === "open" ? "default" : "outline"}
                    className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto"
                  >
                    <Link to={`/discrepancies/${row.id}`} state={backHere}>
                      {row.status === "open" ? "Settle it" : "Review"}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
