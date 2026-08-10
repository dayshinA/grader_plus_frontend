import { GraduationCap, MoreHorizontal, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
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
import { PageHeader } from "~/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useAcademicModules } from "~/features/academic-modules/api/use-academic-modules";
import { DeactivateModuleDialog } from "~/features/academic-modules/components/deactivate-module-dialog";
import {
  ModuleFormDialog,
  type ModuleFormDialogOption,
} from "~/features/academic-modules/components/module-form-dialog";
import type { AcademicModuleResponse } from "~/features/academic-modules/types";
import { useAuth } from "~/features/auth/api/auth-context";
import { findNavItem } from "~/features/dashboard/nav";
import { useDepartmentCoordinators } from "~/features/departments/api/use-department-coordinators";
import { useDepartments } from "~/features/departments/api/use-departments";
import { hasPermission, hasRole } from "~/features/permissions/utils";
import { usePagedList } from "~/hooks/use-paged-list";
import { is403 } from "~/lib/api-client";

type StatusFilter = "all" | "active" | "inactive";

const STATUS_FILTERS: FilterTabOption<StatusFilter>[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

type FormDialogState =
  | { mode: "create" }
  | { mode: "edit"; module: AcademicModuleResponse }
  | null;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// CH-15 (Phase 4): no more `viewer` prop threaded down from the route — both
// `/workspace/module-settings` and `/super-admin/modules` render this same component and it
// derives its own Super-Admin-ness from the RBAC summary (role *identity*, not a capability —
// see `hasRole`'s own doc comment).
export function ModulesPage() {
  const { permissions: summary } = useAuth();
  const isSuperAdmin = hasRole(summary, "system_administrator");
  // Real capability checks, not identity — System Administrator now holds only
  // modules.view (read-only oversight, 2026-08-03), so unlike before this redesign it
  // can no longer be assumed that reaching this page at all implies full CRUD.
  const canCreate = hasPermission(summary, "modules.create");
  const canUpdate = hasPermission(summary, "modules.update");
  const canDeactivate = hasPermission(summary, "modules.deactivate");
  const canWriteAny = canUpdate || canDeactivate;
  const {
    data: modules,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useAcademicModules();
  // GET /departments is now self-filtering by role (2026-07-11 backend fix — see decision #33):
  // a Coordinator gets back only the departments they administer or hold a creation grant in,
  // each with a real name and an `isAdmin` flag.
  const { data: departments } = useDepartments();
  // CH-15: fetched for every viewer now, not Super-Admin-only — a School/Department Admin also
  // needs coordinator names to render the now-visible-but-read-only Coordinator field on edit
  // (`ModuleFormDialog`). Sourced from GET /departments/:id/coordinators rather than GET /users —
  // see `coordinatorOptions`'s own comment for why. Any department id from the list above
  // satisfies the route's auth gate; the endpoint returns every active coordinator system-wide
  // regardless of which one is passed (confirmed in `use-delegation-candidates.ts`, Phase 2), so
  // the first department is enough. A plain Coordinator whose account can't reach this endpoint
  // just gets `coordinators: undefined` — degrades to the same "—" fallback already used for
  // unresolved department/coordinator names, not an error.
  const { data: coordinators } = useDepartmentCoordinators(departments?.[0]?.id);

  const [searchParams, setSearchParams] = useSearchParams();
  // Department-first browsing for the System Administrator oversight viewer (2026-08-05, mirrors
  // DepartmentsPage's school-first picker) — nothing to show until one is picked. Every other
  // viewer (Coordinator/School/Department Admin) keeps the flat, unfiltered list: their own
  // GET /academic-modules is already scoped narrowly enough not to need this, and this is the
  // same `/workspace/module-settings` screen (decision #33) they create/manage modules from.
  const departmentIdFilter = isSuperAdmin ? searchParams.get("departmentId") : null;

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [formDialog, setFormDialog] = useState<FormDialogState>(null);
  // Bumped every time the form dialog opens, and used as ModuleFormDialog's `key` below — forces
  // a fresh mount (fresh form/mutation state) on every open instead of an effect-based reset.
  const [formDialogNonce, setFormDialogNonce] = useState(0);
  const [deactivateTarget, setDeactivateTarget] = useState<AcademicModuleResponse | null>(null);

  function openFormDialog(state: FormDialogState) {
    setFormDialog(state);
    setFormDialogNonce((n) => n + 1);
  }

  function handleDepartmentChange(nextDepartmentId: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("departmentId", nextDepartmentId);
        // A different department is a different list — page 3 of the old one means nothing here.
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  }

  const departmentsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const department of departments ?? []) map.set(department.id, department.name);
    return map;
  }, [departments]);

  const coordinatorsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const coordinator of coordinators ?? []) map.set(coordinator.id, coordinator.fullName);
    return map;
  }, [coordinators]);

  // Shared by both viewers now that GET /departments self-filters: Super Admin gets every
  // department (all with isAdmin: true, per the backend's own convention) with inactive ones
  // labeled; a Coordinator gets only departments they already have rights in (server-side
  // filtered, always active), with a "(creation grant only)" suffix on ones they don't
  // administer — same "(Inactive)" labeling convention as department-admin-grants-page.tsx's
  // own department Select.
  const departmentOptions: ModuleFormDialogOption[] = useMemo(
    () =>
      (departments ?? []).map((department) => {
        const suffix = !department.isActive
          ? " (Inactive)"
          : department.isAdmin === false
            ? " (creation grant only)"
            : "";
        return { id: department.id, label: `${department.name}${suffix}` };
      }),
    [departments],
  );

  // `GET /departments/:id/coordinators` returns every active coordinator system-wide, not just
  // ones in that department — it's an auth-scoped endpoint, not a data-scoped one (see
  // `DepartmentsService.findCoordinators` and `use-delegation-candidates.ts`'s own comment). So
  // there's nothing to filter by `isActive` here (coordinators are already active-only) or by
  // department (the list is already everyone). Shared by every viewer as of CH-15 — see the
  // `useDepartmentCoordinators` call above.
  const coordinatorOptions: ModuleFormDialogOption[] = useMemo(
    () =>
      (coordinators ?? []).map((coordinator) => ({
        id: coordinator.id,
        label: `${coordinator.fullName} (${coordinator.email})`,
      })),
    [coordinators],
  );

  const filtered = useMemo(() => {
    if (!modules) return [];
    // System Administrator browses department-first — nothing to show until one is picked.
    // Every other viewer keeps the flat, unfiltered list.
    const scoped = isSuperAdmin
      ? departmentIdFilter
        ? modules.filter((module) => module.departmentId === departmentIdFilter)
        : []
      : modules;
    const query = search.trim().toLowerCase();
    return scoped.filter(
      (module) =>
        (status === "all" || (status === "active") === module.isActive) &&
        (query === "" ||
          module.name.toLowerCase().includes(query) ||
          module.code.toLowerCase().includes(query)),
    );
  }, [modules, isSuperAdmin, departmentIdFilter, search, status]);

  const { rows, page, pageCount, setPage, total } = usePagedList(filtered);
  const hasFilters = search.trim() !== "" || status !== "all";

  // Department is dropped for the System Administrator viewer once scoped to one via the picker
  // below (every row would share it) but kept for every other viewer, who still sees a flat,
  // unscoped list. Coordinator is added only for the System Administrator viewer (a UI scope
  // choice, not an endpoint restriction), and Actions only for a viewer who can actually update
  // or deactivate a module — a read-only oversight viewer (System Administrator, since
  // 2026-08-03) gets neither.
  const showDepartmentColumn = !isSuperAdmin;
  const isForbidden = isError && is403(error);
  const selectedDepartment = departmentIdFilter
    ? departmentsById.get(departmentIdFilter)
    : undefined;

  function rowActions(module: AcademicModuleResponse) {
    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer"
            aria-label={`Actions for ${module.name}`}
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canUpdate && (
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => openFormDialog({ mode: "edit", module })}
            >
              Edit
            </DropdownMenuItem>
          )}
          {canDeactivate && (
            <DropdownMenuItem
              className="cursor-pointer"
              variant={module.isActive ? "destructive" : "default"}
              onSelect={() => setDeactivateTarget(module)}
            >
              {module.isActive ? "Deactivate" : "Reactivate"}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const columns: DataTableColumn<AcademicModuleResponse>[] = [
    {
      id: "code",
      header: "Code",
      cell: (module) => <span className="font-medium text-foreground">{module.code}</span>,
      skeletonClassName: "w-16",
    },
    {
      id: "name",
      header: "Name",
      cell: (module) => <span className="text-foreground">{module.name}</span>,
      skeletonClassName: "w-44",
    },
    ...(showDepartmentColumn
      ? [
          {
            id: "department",
            header: "Department",
            cell: (module: AcademicModuleResponse) => (
              <span className="text-muted-foreground">
                {departmentsById.get(module.departmentId) ?? "—"}
              </span>
            ),
            className: "hidden lg:table-cell",
            skeletonClassName: "w-32",
          },
        ]
      : []),
    ...(isSuperAdmin
      ? [
          {
            id: "coordinator",
            header: "Coordinator",
            cell: (module: AcademicModuleResponse) => (
              <span className="text-muted-foreground">
                {coordinatorsById.get(module.coordinatorId) ?? "—"}
              </span>
            ),
            className: "hidden lg:table-cell",
            skeletonClassName: "w-32",
          },
        ]
      : []),
    {
      id: "deadline",
      header: "Marking deadline",
      cell: (module) => (
        <span className="tabular-nums text-muted-foreground">
          {formatDate(module.markingDeadline)}
        </span>
      ),
      className: "hidden md:table-cell",
      skeletonClassName: "w-24",
    },
    {
      id: "status",
      header: "Status",
      cell: (module) => (
        <Badge variant={module.isActive ? "success" : "outline"}>
          {module.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
      skeletonClassName: "w-16",
    },
    ...(canWriteAny
      ? [
          {
            id: "actions",
            header: <span className="sr-only">Actions</span>,
            align: "end" as const,
            cell: rowActions,
            className: "w-12",
            skeletonClassName: "size-8 rounded-md",
          },
        ]
      : []),
  ];

  const renderCard = (module: AcademicModuleResponse) => (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{module.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {module.code}
            {showDepartmentColumn && ` · ${departmentsById.get(module.departmentId) ?? "—"}`}
          </p>
        </div>
        {canWriteAny && rowActions(module)}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <Badge variant={module.isActive ? "success" : "outline"}>
          {module.isActive ? "Active" : "Inactive"}
        </Badge>
        <span className="text-xs tabular-nums text-muted-foreground">
          Due {formatDate(module.markingDeadline)}
        </span>
      </div>
    </div>
  );

  const title = isSuperAdmin ? "Modules" : "Module Settings";
  const description = isSuperAdmin
    ? findNavItem("/super-admin/modules")?.description
    : findNavItem("/workspace/module-settings")?.description;

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          canCreate ? (
            <Button
              className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto"
              onClick={() => openFormDialog({ mode: "create" })}
            >
              <Plus aria-hidden="true" />
              Add module
            </Button>
          ) : undefined
        }
      />

      {/* CH-17: a 403 here means "nothing this account is allowed to list" (a department-scoped
          Coordinator whose grant doesn't carry modules.view, most commonly) — that renders as the
          table's own empty state below, not an error card. Any other failure still does. */}
      {isError && !isForbidden ? (
        <ErrorCard
          title="Couldn't load modules"
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {isSuperAdmin && (
              <div className="w-full sm:max-w-xs">
                <Select
                  value={departmentIdFilter ?? undefined}
                  onValueChange={handleDepartmentChange}
                >
                  <SelectTrigger aria-label="Select a department">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(!isSuperAdmin || departmentIdFilter) && (
              <ListToolbar
                className="flex-1"
                search={search}
                onSearchChange={setSearch}
                placeholder="Search by code or name"
                searchLabel="Search modules by code or name"
                filters={
                  <FilterTabs
                    options={STATUS_FILTERS}
                    value={status}
                    onChange={setStatus}
                    label="Filter by status"
                  />
                }
              />
            )}
          </div>

          {isSuperAdmin && !departmentIdFilter ? (
            <Card>
              <CardContent className="py-4">
                <Empty className="px-0">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <GraduationCap aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>Pick a department</EmptyTitle>
                    <EmptyDescription>
                      Modules belong to a department. Choose one above to see its modules.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <DataTable
                columns={columns}
                rows={rows}
                getRowId={(module) => module.id}
                renderCard={renderCard}
                isLoading={isLoading}
                caption="Academic modules"
                empty={
                  <Card>
                    <CardContent className="py-4">
                      <Empty className="px-0">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <GraduationCap aria-hidden="true" />
                          </EmptyMedia>
                          <EmptyTitle>
                            {hasFilters ? "No matches" : "No modules yet"}
                          </EmptyTitle>
                          <EmptyDescription>
                            {hasFilters
                              ? "Try a different search term, or clear the filters."
                              : isForbidden
                                ? "You don't have any modules to see yet."
                                : isSuperAdmin
                                  ? `${selectedDepartment ?? "This department"} has no modules yet.`
                                  : "Create a module to set up its rubric, markers and deadline."}
                          </EmptyDescription>
                        </EmptyHeader>
                        {hasFilters ? (
                          <Button
                            variant="outline"
                            className="h-11 cursor-pointer sm:h-9"
                            onClick={() => {
                              setSearch("");
                              setStatus("all");
                            }}
                          >
                            Clear filters
                          </Button>
                        ) : canCreate ? (
                          <Button
                            className="h-11 cursor-pointer sm:h-9"
                            onClick={() => openFormDialog({ mode: "create" })}
                          >
                            <Plus aria-hidden="true" />
                            Add module
                          </Button>
                        ) : null}
                      </Empty>
                    </CardContent>
                  </Card>
                }
              />

              {!isLoading && rows.length > 0 && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground" aria-live="polite">
                    {total} {total === 1 ? "module" : "modules"}
                    {pageCount > 1 && ` · page ${page} of ${pageCount}`}
                  </p>
                  <ListPager page={page} pageCount={pageCount} onPageChange={setPage} />
                </div>
              )}
            </div>
          )}
        </>
      )}

      <ModuleFormDialog
        key={formDialogNonce}
        open={formDialog !== null}
        onOpenChange={(open) => !open && setFormDialog(null)}
        mode={formDialog?.mode ?? "create"}
        module={formDialog?.mode === "edit" ? formDialog.module : undefined}
        departmentOptions={departmentOptions}
        coordinatorOptions={coordinatorOptions}
        onSuccess={(mode, savedModule, apiMessage) =>
          toast.success(apiMessage, {
            description:
              mode === "create"
                ? `${savedModule.name} has been created.`
                : `${savedModule.name}'s details have been saved.`,
          })
        }
      />

      <DeactivateModuleDialog
        module={deactivateTarget}
        open={deactivateTarget !== null}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        onSuccess={(action, targetModule, apiMessage) =>
          toast.success(apiMessage, {
            description:
              action === "deactivated"
                ? `${targetModule.name} is now marked inactive.`
                : `${targetModule.name} is active again.`,
          })
        }
      />
    </div>
  );
}
