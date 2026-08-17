import { useMemo, useState } from "react";
import { GraduationCap, Pencil, Plus, Upload } from "lucide-react";
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
import { ImportFileDialog } from "~/components/ui/import-file-dialog";
import { ListPager } from "~/components/ui/list-pager";
import { ListToolbar } from "~/components/ui/list-toolbar";
import { usePermission } from "~/features/auth/api/auth-context";
import {
  useImportProgrammes,
  useProgrammes,
  useUpdateProgramme,
} from "~/features/structure/api/use-structure";
import { ProgrammeFormDialog } from "~/features/structure/components/programme-form-dialog";
import { PROGRAMME_LEVEL_LABELS, type Programme } from "~/features/structure/types";
import { usePagedList } from "~/hooks/use-paged-list";
import { pluralise } from "~/utils/format";

/**
 * The programme list for one unit. Used by the platform screen with a unit picker above it
 * and by the unit surface with the unit already fixed.
 */
export function ProgrammesPanel({ unitId }: { unitId: string }) {
  const canCreate = usePermission("programme.create");
  const canEdit = usePermission("programme.update");
  const { data, isLoading, isError, error, refetch, isFetching } = useProgrammes(unitId);
  const update = useUpdateProgramme(unitId);
  const importProgrammes = useImportProgrammes(unitId);

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Programme | undefined>();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = data ?? [];
    if (!term) return rows;
    return rows.filter((programme) =>
      `${programme.code} ${programme.title}`.toLowerCase().includes(term),
    );
  }, [data, search]);

  const paged = usePagedList(filtered, 15);

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function toggleActive(programme: Programme) {
    update.mutate(
      { id: programme.id, payload: { isActive: !programme.isActive } },
      { onSuccess: ({ message }) => toast.success(message || "Programme updated.") },
    );
  }

  if (isError) {
    return (
      <ErrorCard
        title="Could not load programmes"
        error={error}
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    );
  }

  const columns: DataTableColumn<Programme>[] = [
    {
      id: "programme",
      header: "Programme",
      cell: (programme) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{programme.title}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">{programme.code}</p>
        </div>
      ),
      skeletonClassName: "w-48",
    },
    {
      id: "level",
      header: "Level",
      cell: (programme) => (
        <span className="text-muted-foreground">{PROGRAMME_LEVEL_LABELS[programme.level]}</span>
      ),
      className: "hidden md:table-cell",
      skeletonClassName: "w-32",
    },
    {
      id: "status",
      header: "Status",
      cell: (programme) =>
        programme.isActive ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="outline">Deactivated</Badge>
        ),
      skeletonClassName: "w-16",
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "end",
      cell: (programme) =>
        canEdit ? (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 cursor-pointer"
              onClick={() => {
                setEditing(programme);
                setFormOpen(true);
              }}
            >
              <Pencil className="size-4" aria-hidden="true" />
              <span className="sr-only">Edit {programme.title}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 cursor-pointer"
              disabled={update.isPending}
              onClick={() => toggleActive(programme)}
            >
              {programme.isActive ? "Deactivate" : "Reactivate"}
            </Button>
          </div>
        ) : null,
      className: "w-40",
      skeletonClassName: "size-8 rounded-md",
    },
  ];

  const renderCard = (programme: Programme) => (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{programme.title}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">{programme.code}</p>
        </div>
        {programme.isActive ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="outline">Deactivated</Badge>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <span className="text-sm text-muted-foreground">
          {PROGRAMME_LEVEL_LABELS[programme.level]}
        </span>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 cursor-pointer"
            onClick={() => {
              setEditing(programme);
              setFormOpen(true);
            }}
          >
            <Pencil className="size-4" aria-hidden="true" />
            Edit
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          searchLabel="Search programmes by code or title"
          placeholder="Search programmes"
          className="flex-1"
        />
        {canCreate && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="size-4" aria-hidden="true" />
              Import
            </Button>
            <Button className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto" onClick={openCreate}>
              <Plus className="size-4" aria-hidden="true" />
              New programme
            </Button>
          </div>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={paged.rows}
        getRowId={(programme) => programme.id}
        renderCard={renderCard}
        isLoading={isLoading}
        caption="Programmes run by this unit"
        empty={
          <Card>
            <CardContent className="py-4">
              <Empty className="px-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <GraduationCap aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>
                    {search ? "No programmes match that search" : "No programmes yet"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {search
                      ? "Try a shorter term, or clear the search."
                      : "This unit runs no programmes yet. A programme is a degree students are enrolled on, and modules link to it many to many rather than sitting under it."}
                  </EmptyDescription>
                </EmptyHeader>
                {!search && canCreate && (
                  <Button className="h-11 cursor-pointer sm:h-9" onClick={openCreate}>
                    <Plus className="size-4" aria-hidden="true" />
                    New programme
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
            {pluralise(paged.total, "programme")}
            {paged.pageCount > 1 && ` · page ${paged.page} of ${paged.pageCount}`}
          </p>
          <ListPager
            page={paged.page}
            pageCount={paged.pageCount}
            onPageChange={paged.setPage}
          />
        </div>
      )}

      {formOpen && (
        <ProgrammeFormDialog
          key={editing?.id ?? "new"}
          open={formOpen}
          onOpenChange={setFormOpen}
          unitId={unitId}
          programme={editing}
        />
      )}

      {importOpen && (
        <ImportFileDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          title="Import programmes"
          description="This only creates programmes, one per row, all under this unit. A row that matches an existing programme exactly is left unchanged, and a code already in use with a different title or level is rejected."
          columnsHelp={
            <>
              <code className="text-xs">code</code>, <code className="text-xs">title</code> and{" "}
              <code className="text-xs">level</code>. Level is written out as a person would:
              Undergraduate, Postgraduate taught or Postgraduate research.
            </>
          }
          template={{
            fileName: "programmes-import-template.csv",
            content: "code,title,level\n",
          }}
          submit={(file, dryRun) => importProgrammes.mutateAsync({ file, dryRun })}
        />
      )}
    </div>
  );
}
