import { useMemo, useState } from "react";
import { Download, Scale } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { DataTable, type DataTableColumn } from "~/components/ui/data-table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { ErrorCard } from "~/components/ui/error-card";
import { FilterTabs, type FilterTabOption } from "~/components/ui/filter-tabs";
import { ListPager } from "~/components/ui/list-pager";
import { ListToolbar } from "~/components/ui/list-toolbar";
import { usePermission } from "~/features/auth/api/auth-context";
import { exportService } from "~/features/export/api/export.service";
import { useGrades } from "~/features/grading/api/use-grading";
import { OverrideGradeDialog } from "~/features/grading/components/override-grade-dialog";
import { GRADE_SOURCE_LABELS, type OfferingGradeRow } from "~/features/grading/types";
import { useOfferingHeader } from "~/features/structure/api/use-offering-header";
import { usePagedList } from "~/hooks/use-paged-list";
import { downloadBlob } from "~/utils/download-file";
import { formatPercent, pluralise } from "~/utils/format";

type Filter = "all" | "graded" | "ungraded";

const FILTERS: FilterTabOption<Filter>[] = [
  { id: "all", label: "All" },
  { id: "graded", label: "Graded" },
  { id: "ungraded", label: "No grade yet" },
];

/**
 * Grades come from `final_grades` and never from evaluations: nothing here assembles a mark
 * in the browser. A project with an open case has no grade yet and appears as such.
 */
export function GradesPage({ offeringId }: { offeringId: string }) {
  const canOverride = usePermission("grade.override");
  const canExport = usePermission("export.run");

  const { offering } = useOfferingHeader(offeringId);
  const closed = offering?.isClosed ?? false;

  const { data, isLoading, isError, error, refetch, isFetching } = useGrades(offeringId);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [overriding, setOverriding] = useState<OfferingGradeRow | undefined>();
  const [downloading, setDownloading] = useState<string | undefined>();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((row) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "graded" && row.mark !== null) ||
        (filter === "ungraded" && row.mark === null && !row.excluded);
      const matchesTerm =
        !term || `${row.studentName} ${row.learnId} ${row.title}`.toLowerCase().includes(term);
      return matchesFilter && matchesTerm;
    });
  }, [data, search, filter]);

  const paged = usePagedList(filtered, 20);

  async function downloadFeedback(row: OfferingGradeRow) {
    setDownloading(row.projectId);
    try {
      const file = await exportService.projectFeedback(row.projectId);
      downloadBlob(
        file.data,
        file.filename ?? `${row.learnId}-feedback.md`,
        "text/markdown",
      );
    } catch {
      toast.error("That feedback document could not be built.");
    } finally {
      setDownloading(undefined);
    }
  }

  if (isError) {
    return (
      <ErrorCard
        title="Could not load grades"
        error={error}
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    );
  }

  const columns: DataTableColumn<OfferingGradeRow>[] = [
    {
      id: "student",
      header: "Student",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.studentName}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">{row.learnId}</p>
        </div>
      ),
      skeletonClassName: "w-36",
    },
    {
      id: "title",
      header: "Project",
      cell: (row) => <span className="truncate text-muted-foreground">{row.title}</span>,
      className: "hidden lg:table-cell",
      skeletonClassName: "w-48",
    },
    {
      id: "mark",
      header: "Mark",
      align: "end",
      cell: (row) =>
        row.excluded ? (
          <Badge variant="destructive">Excluded</Badge>
        ) : row.mark === null ? (
          <span className="text-sm text-muted-foreground">No grade yet</span>
        ) : (
          <span className="text-sm font-medium tabular-nums">{formatPercent(row.mark)}</span>
        ),
      skeletonClassName: "w-16",
    },
    {
      id: "source",
      header: "How",
      cell: (row) =>
        row.source ? (
          <Badge variant={row.source === "exceptional_override" ? "warning" : "secondary"}>
            {GRADE_SOURCE_LABELS[row.source]}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Not settled</span>
        ),
      className: "hidden md:table-cell",
      skeletonClassName: "w-28",
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "end",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          {canExport && row.mark !== null && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 cursor-pointer"
              disabled={downloading === row.projectId}
              onClick={() => void downloadFeedback(row)}
            >
              <Download className="size-4" aria-hidden="true" />
              <span className="sr-only">Download {row.studentName}&apos;s feedback</span>
            </Button>
          )}
          {canOverride && !closed && !row.excluded && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 cursor-pointer"
              onClick={() => setOverriding(row)}
            >
              Override
            </Button>
          )}
        </div>
      ),
      className: "w-32",
      skeletonClassName: "size-8 rounded-md",
    },
  ];

  const renderCard = (row: OfferingGradeRow) => (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{row.studentName}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">{row.learnId}</p>
        </div>
        {row.excluded ? (
          <Badge variant="destructive">Excluded</Badge>
        ) : row.mark === null ? (
          <Badge variant="outline">No grade</Badge>
        ) : (
          <span className="text-lg font-semibold tabular-nums">{formatPercent(row.mark)}</span>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{row.title}</p>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
        {row.source ? (
          <Badge variant={row.source === "exceptional_override" ? "warning" : "secondary"}>
            {GRADE_SOURCE_LABELS[row.source]}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Not settled yet</span>
        )}
        {canOverride && !closed && !row.excluded && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 cursor-pointer"
            onClick={() => setOverriding(row)}
          >
            Override
          </Button>
        )}
      </div>
    </div>
  );

  const graded = (data ?? []).filter((row) => row.mark !== null).length;
  const hasFilters = search.trim() !== "" || filter !== "all";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {pluralise(graded, "project")} graded out of {(data ?? []).length}. A project with an
        open discrepancy has no grade yet, and shows as such rather than as a zero.
      </p>

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchLabel="Search grades by student, Learn ID or title"
        placeholder="Search grades"
        filters={
          <FilterTabs
            options={FILTERS}
            value={filter}
            onChange={setFilter}
            label="Filter by grade status"
          />
        }
      />

      <DataTable
        columns={columns}
        rows={paged.rows}
        getRowId={(row) => row.projectId}
        renderCard={renderCard}
        isLoading={isLoading}
        caption="Final grades on this offering"
        empty={
          <Card>
            <CardContent className="py-4">
              <Empty className="px-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Scale aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>{hasFilters ? "No projects match" : "No grades yet"}</EmptyTitle>
                  <EmptyDescription>
                    {hasFilters
                      ? "Try a different search term, or clear the filters."
                      : "A grade is written when every marker on a project has submitted and they agreed, or when you settle a discrepancy. Nothing here is assembled from individual evaluations."}
                  </EmptyDescription>
                </EmptyHeader>
                {hasFilters && (
                  <Button
                    variant="outline"
                    className="h-11 cursor-pointer sm:h-9"
                    onClick={() => {
                      setSearch("");
                      setFilter("all");
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </Empty>
            </CardContent>
          </Card>
        }
      />

      {!isLoading && paged.total > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {pluralise(paged.total, "project")}
            {paged.pageCount > 1 && ` · page ${paged.page} of ${paged.pageCount}`}
          </p>
          <ListPager page={paged.page} pageCount={paged.pageCount} onPageChange={paged.setPage} />
        </div>
      )}

      {overriding && (
        <OverrideGradeDialog
          key={overriding.projectId}
          open
          onOpenChange={(open) => !open && setOverriding(undefined)}
          offeringId={offeringId}
          project={overriding}
        />
      )}
    </div>
  );
}
