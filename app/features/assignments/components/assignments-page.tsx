import { useMemo, useState } from "react";
import { Plus, Trash2, Upload, UserPlus, Users, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import { Card, CardContent } from "~/components/ui/card";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { ErrorCard } from "~/components/ui/error-card";
import { FileInput } from "~/components/ui/file-input";
import { FilterTabs, type FilterTabOption } from "~/components/ui/filter-tabs";
import { FormError } from "~/components/ui/form-error";
import { ListPager } from "~/components/ui/list-pager";
import { ListToolbar } from "~/components/ui/list-toolbar";
import { Skeleton } from "~/components/ui/skeleton";
import {
  useAssignments,
  useImportAssignments,
  useRemoveAssignment,
} from "~/features/assignments/api/use-assignments";
import { AssignMarkerDialog } from "~/features/assignments/components/assign-marker-dialog";
import { AutoAssignDialog } from "~/features/assignments/components/auto-assign-dialog";
import { CoverageCard } from "~/features/assignments/components/coverage-card";
import {
  ASSIGNMENT_ROLE_LABELS,
  type MarkerAssignment,
} from "~/features/assignments/types";
import { MarkerEligibilityImportDialog } from "~/features/access/components/marker-eligibility-import-dialog";
import { usePermission } from "~/features/auth/api/auth-context";
import { useProjects } from "~/features/intake/api/use-intake";
import type { Project } from "~/features/intake/types";
import { useOfferingHeader } from "~/features/structure/api/use-offering-header";
import { usePagedList } from "~/hooks/use-paged-list";
import { pluralise } from "~/utils/format";

const MINIMUM_MARKERS = 2;
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

type Filter = "all" | "short" | "covered";

const FILTERS: FilterTabOption<Filter>[] = [
  { id: "all", label: "All" },
  { id: "short", label: "Short of markers" },
  { id: "covered", label: "Covered" },
];

function ImportDialog({
  open,
  onOpenChange,
  offeringId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offeringId: string;
}) {
  const importMatrix = useImportAssignments(offeringId);
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | undefined>();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import an assignment matrix</DialogTitle>
          <DialogDescription>
            All or nothing. Every row is resolved and checked before anything is written,
            because a half applied matrix is worse than none.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormError error={importMatrix.error} />

          <Callout variant="info" title="Columns">
            <code className="text-xs">learnId</code>,{" "}
            <code className="text-xs">markerEmail</code> and{" "}
            <code className="text-xs">role</code>, one row per marker per project. Role is one
            of first_marker, second_marker, additional_marker or moderator.
          </Callout>

          <FileInput
            accept={[".csv", ".xlsx"]}
            maxSizeBytes={MAX_IMPORT_BYTES}
            disabled={importMatrix.isPending}
            onFileSelect={(chosen) => {
              setFile(chosen);
              setLocalError(undefined);
            }}
            onError={setLocalError}
          />

          {localError && (
            <p role="alert" className="text-xs text-destructive">
              {localError}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 cursor-pointer sm:h-9"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-11 cursor-pointer sm:h-9"
            disabled={!file || importMatrix.isPending}
            aria-busy={importMatrix.isPending}
            onClick={() => {
              if (!file) return;
              importMatrix.mutate(file, {
                onSuccess: ({ data, message }) => {
                  toast.success(message || `${pluralise(data.length, "assignment")} created.`);
                  onOpenChange(false);
                },
              });
            }}
          >
            {importMatrix.isPending ? "Importing" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The allocation, project by project. This screen names markers, which is correct:
 * deciding who marks what requires knowing who they are, and blindness is between markers
 * rather than between a coordinator and their own allocation.
 */
export function AssignmentsPage({ offeringId }: { offeringId: string }) {
  const canWrite = usePermission("assignment.write");
  const canOpenMarking = usePermission("offering.update");
  const canGrant = usePermission("role.grant");

  const { offering } = useOfferingHeader(offeringId);
  const closed = offering?.isClosed ?? false;

  const assignments = useAssignments(offeringId);
  const projects = useProjects(offeringId);
  const remove = useRemoveAssignment(offeringId);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [assigning, setAssigning] = useState<Project | undefined>();
  const [autoOpen, setAutoOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [eligibilityOpen, setEligibilityOpen] = useState(false);
  const [removing, setRemoving] = useState<MarkerAssignment | undefined>();

  const byProject = useMemo(() => {
    const map = new Map<string, MarkerAssignment[]>();
    for (const assignment of assignments.data ?? []) {
      const list = map.get(assignment.projectId) ?? [];
      list.push(assignment);
      map.set(assignment.projectId, list);
    }
    return map;
  }, [assignments.data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (projects.data ?? [])
      .filter((project) => project.excludedAt === null)
      .filter((project) => {
        const count = byProject.get(project.id)?.length ?? 0;
        const matchesFilter =
          filter === "all" ||
          (filter === "short" && count < MINIMUM_MARKERS) ||
          (filter === "covered" && count >= MINIMUM_MARKERS);
        const matchesTerm =
          !term ||
          `${project.studentNameSnapshot} ${project.title}`.toLowerCase().includes(term);
        return matchesFilter && matchesTerm;
      });
  }, [projects.data, byProject, search, filter]);

  const paged = usePagedList(filtered, 15);

  if (assignments.isError || projects.isError) {
    return (
      <ErrorCard
        title="Could not load the allocation"
        error={assignments.error ?? projects.error}
        onRetry={() => {
          void assignments.refetch();
          void projects.refetch();
        }}
        isRetrying={assignments.isFetching || projects.isFetching}
      />
    );
  }

  const loading = assignments.isPending || projects.isPending;
  const hasFilters = search.trim() !== "" || filter !== "all";

  return (
    <div className="space-y-6">
      <CoverageCard
        offeringId={offeringId}
        canOpen={canOpenMarking && !closed}
        status={offering?.status ?? "setup"}
      />

      {closed && (
        <Callout variant="warning" title="This offering is closed">
          The allocation is frozen along with the grades.
        </Callout>
      )}

      {!closed && (canWrite || canGrant) && (
        <div className="flex flex-col gap-2 sm:flex-row">
          {canWrite && (
            <>
              <Button
                variant="outline"
                className="h-11 cursor-pointer sm:h-9"
                onClick={() => setAutoOpen(true)}
              >
                <Wand2 className="size-4" aria-hidden="true" />
                Propose an allocation
              </Button>
              <Button
                variant="outline"
                className="h-11 cursor-pointer sm:h-9"
                onClick={() => setImportOpen(true)}
              >
                <Upload className="size-4" aria-hidden="true" />
                Import a matrix
              </Button>
            </>
          )}
          {canGrant && (
            <Button
              variant="outline"
              className="h-11 cursor-pointer sm:h-9"
              onClick={() => setEligibilityOpen(true)}
            >
              <UserPlus className="size-4" aria-hidden="true" />
              Import eligible markers
            </Button>
          )}
        </div>
      )}

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchLabel="Search projects by student or title"
        placeholder="Search projects"
        filters={
          <FilterTabs
            options={FILTERS}
            value={filter}
            onChange={setFilter}
            label="Filter by marker coverage"
          />
        }
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : paged.total === 0 ? (
        <Card>
          <CardContent className="py-4">
            <Empty className="px-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>{hasFilters ? "No projects match" : "No projects yet"}</EmptyTitle>
                <EmptyDescription>
                  {hasFilters
                    ? "Try a different search term, or clear the filters."
                    : "There is nothing to allocate until intake has produced projects."}
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
      ) : (
        <ul className="space-y-3">
          {paged.rows.map((project) => {
            const rows = byProject.get(project.id) ?? [];
            const short = rows.length < MINIMUM_MARKERS;

            return (
              <li key={project.id}>
                <Card>
                  <CardContent className="space-y-3 py-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{project.studentNameSnapshot}</p>
                        <p className="truncate text-xs text-muted-foreground">{project.title}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {short ? (
                          <Badge variant="warning">
                            {pluralise(rows.length, "marker")}
                          </Badge>
                        ) : (
                          <Badge variant="success">{pluralise(rows.length, "marker")}</Badge>
                        )}
                        {canWrite && !closed && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 cursor-pointer"
                            onClick={() => setAssigning(project)}
                          >
                            <Plus className="size-4" aria-hidden="true" />
                            Assign
                          </Button>
                        )}
                      </div>
                    </div>

                    {rows.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nobody is on this project yet. It needs two markers before marking can
                        open.
                      </p>
                    ) : (
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {rows.map((assignment) => (
                          <li
                            key={assignment.id}
                            className="flex items-center gap-2 rounded-lg border border-border p-2.5"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm">
                                {assignment.marker?.fullName ?? "Marker"}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {ASSIGNMENT_ROLE_LABELS[assignment.assignmentRole]}
                              </p>
                            </div>
                            {canWrite && !closed && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 shrink-0 cursor-pointer text-destructive hover:text-destructive"
                                onClick={() => setRemoving(assignment)}
                              >
                                <Trash2 className="size-4" aria-hidden="true" />
                                <span className="sr-only">
                                  Remove {assignment.marker?.fullName ?? "this marker"}
                                </span>
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && paged.total > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {pluralise(paged.total, "project")}
            {paged.pageCount > 1 && ` · page ${paged.page} of ${paged.pageCount}`}
          </p>
          <ListPager page={paged.page} pageCount={paged.pageCount} onPageChange={paged.setPage} />
        </div>
      )}

      {assigning && (
        <AssignMarkerDialog
          key={assigning.id}
          open
          onOpenChange={(open) => !open && setAssigning(undefined)}
          offeringId={offeringId}
          project={assigning}
          existing={byProject.get(assigning.id) ?? []}
        />
      )}

      {autoOpen && (
        <AutoAssignDialog
          open={autoOpen}
          onOpenChange={setAutoOpen}
          offeringId={offeringId}
          onApplied={() => void assignments.refetch()}
        />
      )}

      {importOpen && (
        <ImportDialog open={importOpen} onOpenChange={setImportOpen} offeringId={offeringId} />
      )}

      {eligibilityOpen && (
        <MarkerEligibilityImportDialog
          open={eligibilityOpen}
          onOpenChange={setEligibilityOpen}
          offeringId={offeringId}
        />
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(undefined)}
        title={`Remove ${removing?.marker?.fullName ?? "this marker"}?`}
        description="They come off the project. This is refused once they have recorded any work on it, and once marking is open it is refused if it would leave the project with fewer than two markers."
        confirmLabel="Remove"
        pendingLabel="Removing"
        destructive
        isPending={remove.isPending}
        onConfirm={() => {
          if (!removing) return;
          remove.mutate(removing.id, {
            onSuccess: ({ message }) => {
              toast.success(message || "Marker removed.");
              setRemoving(undefined);
            },
          });
        }}
      />
    </div>
  );
}
