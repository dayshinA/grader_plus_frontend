import { useMemo, useState } from "react";
import { FileText, FolderOpen, Pencil, Plus, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "~/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
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
import {
  useDeleteProject,
  useIncludeProject,
  useProjects,
} from "~/features/intake/api/use-intake";
import { ArchiveUploadCard } from "~/features/intake/components/archive-upload-card";
import { ExcludeProjectDialog } from "~/features/intake/components/exclude-project-dialog";
import { ProjectFilesDialog } from "~/features/intake/components/project-files-dialog";
import { ProjectFormDialog } from "~/features/intake/components/project-form-dialog";
import { PROJECT_STATUS_LABELS, type Project } from "~/features/intake/types";
import { useOfferingHeader } from "~/features/structure/api/use-offering-header";
import { usePagedList } from "~/hooks/use-paged-list";
import { pluralise } from "~/utils/format";

type Filter = "all" | "included" | "excluded";

const FILTERS: FilterTabOption<Filter>[] = [
  { id: "all", label: "All" },
  { id: "included", label: "Included" },
  { id: "excluded", label: "Excluded" },
];

// The project list is what this offering marks against, so unreadable folders are fixed by hand.
export function IntakePage({ offeringId }: { offeringId: string }) {
  const canUpload = usePermission("intake.upload");
  const canCreate = usePermission("project.create");
  const canDelete = usePermission("project.delete");
  const canExclude = usePermission("project.exclude");

  const { offering } = useOfferingHeader(offeringId);
  const closed = offering?.isClosed ?? false;

  const { data, isLoading, isError, error, refetch, isFetching } = useProjects(offeringId);
  const remove = useDeleteProject(offeringId);
  const include = useIncludeProject(offeringId);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | undefined>();
  const [excluding, setExcluding] = useState<Project | undefined>();
  const [files, setFiles] = useState<Project | undefined>();
  const [deleting, setDeleting] = useState<Project | undefined>();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((project) => {
      const excluded = project.excludedAt !== null;
      const matchesFilter =
        filter === "all" ||
        (filter === "included" && !excluded) ||
        (filter === "excluded" && excluded);
      const matchesTerm =
        !term ||
        `${project.studentNameSnapshot} ${project.title} ${project.student?.learnId ?? ""}`
          .toLowerCase()
          .includes(term);
      return matchesFilter && matchesTerm;
    });
  }, [data, search, filter]);

  const paged = usePagedList(filtered, 20);
  const excludedCount = (data ?? []).filter((project) => project.excludedAt !== null).length;

  const columns: DataTableColumn<Project>[] = [
    {
      id: "student",
      header: "Student",
      cell: (project) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{project.studentNameSnapshot}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {project.student?.learnId ?? "Not set"}
          </p>
        </div>
      ),
      skeletonClassName: "w-36",
    },
    {
      id: "title",
      header: "Project",
      cell: (project) => (
        <div className="min-w-0">
          <p className="truncate">{project.title}</p>
          {project.supervisorName && (
            <p className="truncate text-xs text-muted-foreground">
              Supervisor {project.supervisorName}
            </p>
          )}
        </div>
      ),
      className: "hidden md:table-cell",
      skeletonClassName: "w-48",
    },
    {
      id: "status",
      header: "Status",
      cell: (project) =>
        project.excludedAt ? (
          <Badge variant="destructive">Excluded</Badge>
        ) : (
          <Badge variant="secondary">{PROJECT_STATUS_LABELS[project.status]}</Badge>
        ),
      skeletonClassName: "w-24",
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "end",
      cell: (project) => <RowActions project={project} />,
      className: "w-12",
      skeletonClassName: "size-8 rounded-md",
    },
  ];

  function RowActions({ project }: { project: Project }) {
    const excluded = project.excludedAt !== null;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-9 cursor-pointer">
            <span aria-hidden="true">⋯</span>
            <span className="sr-only">Actions for {project.studentNameSnapshot}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="cursor-pointer" onSelect={() => setFiles(project)}>
            <FileText aria-hidden="true" />
            Files
          </DropdownMenuItem>

          {!closed && canCreate && (
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => {
                setEditing(project);
                setFormOpen(true);
              }}
            >
              <Pencil aria-hidden="true" />
              Edit
            </DropdownMenuItem>
          )}

          {!closed && canExclude && !excluded && (
            <DropdownMenuItem className="cursor-pointer" onSelect={() => setExcluding(project)}>
              <Undo2 aria-hidden="true" />
              Exclude
            </DropdownMenuItem>
          )}

          {!closed && canExclude && excluded && (
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() =>
                include.mutate(project.id, {
                  onSuccess: ({ message }) => toast.success(message || "Project included again."),
                })
              }
            >
              <Undo2 aria-hidden="true" />
              Include again
            </DropdownMenuItem>
          )}

          {!closed && canDelete && (
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer"
              onSelect={() => setDeleting(project)}
            >
              <Trash2 aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const renderCard = (project: Project) => (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{project.studentNameSnapshot}</p>
          <p className="truncate text-xs text-muted-foreground">
            {project.student?.learnId ?? "Not set"}
          </p>
        </div>
        <RowActions project={project} />
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{project.title}</p>
      <div className="mt-3 border-t border-border pt-3">
        {project.excludedAt ? (
          <div className="space-y-1">
            <Badge variant="destructive">Excluded</Badge>
            {project.exclusionReason && (
              <p className="text-xs text-muted-foreground">{project.exclusionReason}</p>
            )}
          </div>
        ) : (
          <Badge variant="secondary">{PROJECT_STATUS_LABELS[project.status]}</Badge>
        )}
      </div>
    </div>
  );

  const hasFilters = search.trim() !== "" || filter !== "all";

  return (
    <div className="space-y-6">
      {canUpload && <ArchiveUploadCard offeringId={offeringId} disabled={closed} />}

      {isError ? (
        <ErrorCard
          title="Could not load projects"
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              Projects
              {excludedCount > 0 && (
                <span className="ml-2 font-normal">
                  ({pluralise(excludedCount, "excluded")})
                </span>
              )}
            </h2>
            {canCreate && !closed && (
              <Button
                variant="outline"
                className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto"
                onClick={() => {
                  setEditing(undefined);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4" aria-hidden="true" />
                Add by hand
              </Button>
            )}
          </div>

          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchLabel="Search projects by student, title or Learn ID"
            placeholder="Search projects"
            filters={
              <FilterTabs
                options={FILTERS}
                value={filter}
                onChange={setFilter}
                label="Filter projects"
              />
            }
          />

          <DataTable
            columns={columns}
            rows={paged.rows}
            getRowId={(project) => project.id}
            renderCard={renderCard}
            isLoading={isLoading}
            caption="Projects on this offering"
            empty={
              <Card>
                <CardContent className="py-4">
                  <Empty className="px-0">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <FolderOpen aria-hidden="true" />
                      </EmptyMedia>
                      <EmptyTitle>
                        {hasFilters ? "No projects match" : "No projects yet"}
                      </EmptyTitle>
                      <EmptyDescription>
                        {hasFilters
                          ? "Try a different search term, or clear the filters."
                          : "Nothing has come in for this offering. Upload the Learn archive above, or add a project by hand if the export is not ready."}
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
              <ListPager
                page={paged.page}
                pageCount={paged.pageCount}
                onPageChange={paged.setPage}
              />
            </div>
          )}
        </div>
      )}

      {formOpen && (
        <ProjectFormDialog
          key={editing?.id ?? "new"}
          open={formOpen}
          onOpenChange={setFormOpen}
          offeringId={offeringId}
          project={editing}
        />
      )}

      {excluding && (
        <ExcludeProjectDialog
          key={excluding.id}
          open
          onOpenChange={(open) => !open && setExcluding(undefined)}
          offeringId={offeringId}
          project={excluding}
        />
      )}

      {files && (
        <ProjectFilesDialog
          key={files.id}
          open
          onOpenChange={(open) => !open && setFiles(undefined)}
          project={files}
          readOnly={closed}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={
          deleting?.studentNameSnapshot
            ? `Delete ${deleting.studentNameSnapshot}'s project?`
            : "Delete this project?"
        }
        description="The project is removed entirely. This is refused once a file is attached or any marking exists on it, and excluding is usually the right answer instead: it keeps the record and says why."
        confirmLabel="Delete"
        pendingLabel="Deleting"
        destructive
        isPending={remove.isPending}
        onConfirm={() => {
          if (!deleting) return;
          remove.mutate(deleting.id, {
            onSuccess: ({ message }) => {
              toast.success(message || "Project deleted.");
              setDeleting(undefined);
            },
          });
        }}
      />
    </div>
  );
}
