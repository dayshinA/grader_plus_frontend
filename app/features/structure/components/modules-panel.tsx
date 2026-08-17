import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import { CalendarPlus, Layers, Link2, Pencil, Plus, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
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
import { Skeleton } from "~/components/ui/skeleton";
import { usePermission } from "~/features/auth/api/auth-context";
import {
  useImportModuleProgrammeLinks,
  useImportModules,
  useModules,
  useOfferings,
  useUnits,
  useUpdateModule,
} from "~/features/structure/api/use-structure";
import { ModuleFormDialog } from "~/features/structure/components/module-form-dialog";
import { ModuleProgrammesDialog } from "~/features/structure/components/module-programmes-dialog";
import { OfferingFormDialog } from "~/features/structure/components/offering-form-dialog";
import { OfferingStatusBadge } from "~/features/structure/components/offering-status-badge";
import type { ProjectModule } from "~/features/structure/types";
import { backTo, useDeclaredBackTarget } from "~/hooks/use-back-link";
import { usePagedList } from "~/hooks/use-paged-list";
import { formatDate, pluralise } from "~/utils/format";

/** A module's offerings, one row each, opened on demand rather than fetched for every row. */
function OfferingList({ moduleId }: { moduleId: string }) {
  const { data, isPending, isError, error, refetch } = useOfferings(moduleId);
  // This panel is mounted at two paths, /admin/modules and /units/:id/modules, so the back
  // target is the screen the reader is actually on rather than a hardcoded one.
  const { pathname, search } = useLocation();
  const declaredBack = useDeclaredBackTarget();

  if (isPending) {
    return <Skeleton className="h-12 rounded-lg" />;
  }

  if (isError) {
    return (
      <ErrorCard title="Could not load offerings" error={error} onRetry={() => void refetch()} />
    );
  }

  if ((data ?? []).length === 0) {
    return (
      <p className="py-2 text-sm text-muted-foreground">
        No offerings yet. Create one for the academic year you are about to run.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {(data ?? []).map((offering) => (
        <li
          key={offering.id}
          className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <Link
              to={`/offerings/${offering.id}`}
              state={backTo({
                to: `${pathname}${search}`,
                label: "modules",
                back: declaredBack,
              })}
              className="font-medium underline-offset-4 hover:underline"
            >
              {offering.academicYear}
            </Link>
            <p className="truncate text-xs text-muted-foreground">
              Deadline {formatDate(offering.markingDeadline)} · threshold{" "}
              {offering.discrepancyThreshold}% · up to {offering.maxMarkersPerProject} markers
            </p>
          </div>
          <OfferingStatusBadge status={offering.status} className="w-fit" />
        </li>
      ))}
    </ul>
  );
}

/**
 * The module list for one unit, with each module's offerings and its programme links
 * reachable from the row. Modules and programmes are siblings, so the links open a set
 * editor rather than appearing as children here.
 */
export function ModulesPanel({ unitId }: { unitId: string }) {
  const canCreate = usePermission("module.create");
  const canEdit = usePermission("module.update");
  const canCreateOffering = usePermission("offering.create");

  const { data, isLoading, isError, error, refetch, isFetching } = useModules(unitId);
  const { data: units } = useUnits();
  const update = useUpdateModule(unitId);
  const importModules = useImportModules(unitId);
  const importLinks = useImportModuleProgrammeLinks(unitId);

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [linkImportOpen, setLinkImportOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectModule | undefined>();
  const [linking, setLinking] = useState<ProjectModule | undefined>();
  const [addingOffering, setAddingOffering] = useState<ProjectModule | undefined>();

  const unit = units?.find((candidate) => candidate.id === unitId);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = data ?? [];
    if (!term) return rows;
    return rows.filter((module) => `${module.code} ${module.title}`.toLowerCase().includes(term));
  }, [data, search]);

  const paged = usePagedList(filtered, 10);

  if (isError) {
    return (
      <ErrorCard
        title="Could not load modules"
        error={error}
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          searchLabel="Search modules by code or title"
          placeholder="Search modules"
          className="flex-1"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          {canEdit && (
            <Button
              variant="outline"
              className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto"
              onClick={() => setLinkImportOpen(true)}
            >
              <Link2 className="size-4" aria-hidden="true" />
              Import links
            </Button>
          )}
          {canCreate && (
            <>
              <Button
                variant="outline"
                className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto"
                onClick={() => setImportOpen(true)}
              >
                <Upload className="size-4" aria-hidden="true" />
                Import
              </Button>
              <Button
                className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto"
                onClick={() => {
                  setEditing(undefined);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4" aria-hidden="true" />
                New module
              </Button>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : paged.total === 0 ? (
        <Card>
          <CardContent className="py-4">
            <Empty className="px-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Layers aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>
                  {search ? "No modules match that search" : "No modules yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {search
                    ? "Try a shorter term, or clear the search."
                    : "A module is the permanent thing, and each academic year of it is an offering. Create the module first, then the year you are about to run."}
                </EmptyDescription>
              </EmptyHeader>
              {!search && canCreate && (
                <Button
                  className="h-11 cursor-pointer sm:h-9"
                  onClick={() => {
                    setEditing(undefined);
                    setFormOpen(true);
                  }}
                >
                  <Plus className="size-4" aria-hidden="true" />
                  New module
                </Button>
              )}
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {paged.rows.map((module) => (
            <Card key={module.id}>
              <CardContent className="space-y-3 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{module.code}</p>
                      {!module.isActive && <Badge variant="outline">Deactivated</Badge>}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{module.title}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {canEdit && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 cursor-pointer"
                          onClick={() => {
                            setEditing(module);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 cursor-pointer"
                          onClick={() => setLinking(module)}
                        >
                          <Link2 className="size-4" aria-hidden="true" />
                          Programmes
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 cursor-pointer"
                          disabled={update.isPending}
                          onClick={() =>
                            update.mutate(
                              { id: module.id, payload: { isActive: !module.isActive } },
                              {
                                onSuccess: ({ message }) =>
                                  toast.success(message || "Module updated."),
                              },
                            )
                          }
                        >
                          {module.isActive ? "Deactivate" : "Reactivate"}
                        </Button>
                      </>
                    )}
                    {canCreateOffering && (
                      <Button
                        size="sm"
                        className="h-9 cursor-pointer"
                        onClick={() => setAddingOffering(module)}
                      >
                        <CalendarPlus className="size-4" aria-hidden="true" />
                        New offering
                      </Button>
                    )}
                  </div>
                </div>

                <Collapsible>
                  <CollapsibleTrigger className="cursor-pointer text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                    Offerings
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <OfferingList moduleId={module.id} />
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && paged.total > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {pluralise(paged.total, "module")}
            {paged.pageCount > 1 && ` · page ${paged.page} of ${paged.pageCount}`}
          </p>
          <ListPager page={paged.page} pageCount={paged.pageCount} onPageChange={paged.setPage} />
        </div>
      )}

      {formOpen && (
        <ModuleFormDialog
          key={editing?.id ?? "new"}
          open={formOpen}
          onOpenChange={setFormOpen}
          unitId={unitId}
          module={editing}
        />
      )}

      {linking && (
        <ModuleProgrammesDialog
          key={linking.id}
          open
          onOpenChange={(open) => !open && setLinking(undefined)}
          module={linking}
          unit={unit}
        />
      )}

      {addingOffering && (
        <OfferingFormDialog
          key={addingOffering.id}
          open
          onOpenChange={(open) => !open && setAddingOffering(undefined)}
          module={addingOffering}
        />
      )}

      {importOpen && (
        <ImportFileDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          title="Import modules"
          description="This only creates modules, one per row, all under this unit. A row that matches an existing module exactly is left unchanged. Programme links have their own import."
          columnsHelp={
            <>
              <code className="text-xs">code</code> and <code className="text-xs">title</code>,
              nothing else.
            </>
          }
          template={{
            fileName: "modules-import-template.csv",
            content: "code,title\n",
          }}
          submit={(file, dryRun) => importModules.mutateAsync({ file, dryRun })}
        />
      )}

      {linkImportOpen && (
        <ImportFileDialog
          open={linkImportOpen}
          onOpenChange={setLinkImportOpen}
          title="Import programme links"
          description="This only adds links, never removes them. Each row links one module under this unit to one programme, and a link that already exists is left unchanged. Removing a link happens in the module's programme editor instead."
          columnsHelp={
            <>
              <code className="text-xs">module_code</code>,{" "}
              <code className="text-xs">programme_code</code> and an optional{" "}
              <code className="text-xs">programme_unit_name</code> naming the unit that runs
              the programme when it is not this one. A link crossing two Schools is service
              teaching and is refused here for everyone; those are made by hand.
            </>
          }
          template={{
            fileName: "module-programme-links-template.csv",
            content: "module_code,programme_code,programme_unit_name\n",
          }}
          submit={(file, dryRun) => importLinks.mutateAsync({ file, dryRun })}
        />
      )}
    </div>
  );
}
