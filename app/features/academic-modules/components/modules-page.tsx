import { GraduationCap, MoreHorizontal, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { PageHeader } from "~/components/ui/page-header";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "~/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { usePagination } from "~/hooks/use-pagination";
import { useAcademicModules } from "~/features/academic-modules/api/use-academic-modules";
import { DeactivateModuleDialog } from "~/features/academic-modules/components/deactivate-module-dialog";
import {
  ModuleFormDialog,
  type ModuleFormDialogOption,
} from "~/features/academic-modules/components/module-form-dialog";
import type { AcademicModuleResponse } from "~/features/academic-modules/types";
import { useAuth } from "~/features/auth/api/auth-context";
import { useDepartmentCoordinators } from "~/features/departments/api/use-department-coordinators";
import { useDepartments } from "~/features/departments/api/use-departments";
import { hasRole } from "~/features/permissions/utils";
import { ApiError, is403 } from "~/lib/api-client";

const PAGE_SIZE = 10;
const PAGINATION_ITEMS_TO_DISPLAY = 5;

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
// `/coordinator/module-settings` and `/super-admin/modules` render this same component and it
// derives its own Super-Admin-ness from the RBAC summary (role *identity*, not a capability —
// see `hasRole`'s own doc comment).
export function ModulesPage() {
  const { permissions: summary } = useAuth();
  const isSuperAdmin = hasRole(summary, "super_admin");
  const { data: modules, isLoading, isError, error } = useAcademicModules();
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

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [formDialog, setFormDialog] = useState<FormDialogState>(null);
  // Bumped every time the form dialog opens, and used as ModuleFormDialog's `key` below — forces
  // a fresh mount (fresh form/mutation state) on every open instead of an effect-based reset.
  const [formDialogNonce, setFormDialogNonce] = useState(0);
  const [deactivateTarget, setDeactivateTarget] = useState<AcademicModuleResponse | null>(null);
  // `id` changes on every call so a repeat of the same title/message still remounts the toast
  // (Alert's own re-trigger convention — see Alert.md).
  const [toast, setToast] = useState<{ id: number; title: string; message: string } | null>(null);

  function openFormDialog(state: FormDialogState) {
    setFormDialog(state);
    setFormDialogNonce((n) => n + 1);
  }

  function showToast(title: string, message: string) {
    setToast({ id: Date.now(), title, message });
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

  const filteredModules = useMemo(() => {
    if (!modules) return [];
    const query = search.trim().toLowerCase();
    if (!query) return modules;
    return modules.filter(
      (module) =>
        module.name.toLowerCase().includes(query) || module.code.toLowerCase().includes(query),
    );
  }, [modules, search]);

  const totalPages = Math.max(1, Math.ceil(filteredModules.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage: safePage,
    totalPages,
    paginationItemsToDisplay: PAGINATION_ITEMS_TO_DISPLAY,
  });
  const pageRows = filteredModules.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSearchChange(value: string) {
    setSearch(value);
    setCurrentPage(1);
  }

  // Base: Code, Name, Department, Marking Deadline, Status, Actions (6) — Coordinator column
  // added only for the Super Admin viewer (a UI scope choice, not an endpoint restriction).
  const columnCount = 6 + (isSuperAdmin ? 1 : 0);
  const isForbidden = isError && is403(error);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={isSuperAdmin ? "Modules" : "Module Settings"}
        icon={GraduationCap}
        actions={
          <Button onClick={() => openFormDialog({ mode: "create" })}>
            <Plus className="h-4 w-4" />
            Add module
          </Button>
        }
      >
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            type="search"
            placeholder="Search by code or name"
            className="pl-9"
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            aria-label="Search modules"
          />
        </div>
      </PageHeader>

      {/* CH-17: a 403 here means "nothing this account is allowed to list" (a department-scoped
          Coordinator whose grant doesn't carry modules.view, most commonly) — that renders as the
          table's own empty state below, not an error banner. Any other failure still does. */}
      {isError && !isForbidden && (
        <Alert
          variant="inline"
          status="error"
          timeout={0}
          title="Couldn't load modules"
          message={
            error instanceof ApiError ? error.message : "Something went wrong. Please try again."
          }
        />
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              {isSuperAdmin && <TableHead>Coordinator</TableHead>}
              <TableHead>Marking Deadline</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                  Loading modules...
                </TableCell>
              </TableRow>
            ) : pageRows.length ? (
              pageRows.map((module) => (
                <TableRow key={module.id}>
                  <TableCell className="font-medium">{module.code}</TableCell>
                  <TableCell>{module.name}</TableCell>
                  <TableCell>{departmentsById.get(module.departmentId) ?? "—"}</TableCell>
                  {isSuperAdmin && (
                    <TableCell>{coordinatorsById.get(module.coordinatorId) ?? "—"}</TableCell>
                  )}
                  <TableCell>{formatDate(module.markingDeadline)}</TableCell>
                  <TableCell>
                    <Badge variant={module.isActive ? "default" : "outline"}>
                      {module.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Actions for ${module.name}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => openFormDialog({ mode: "edit", module })}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setDeactivateTarget(module)}>
                          {module.isActive ? "Deactivate" : "Reactivate"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center text-muted-foreground">
                  {search ? (
                    <div className="flex h-24 items-center justify-center">
                      No modules match your search.
                    </div>
                  ) : isForbidden ? (
                    <div className="flex h-24 flex-col items-center justify-center gap-2">
                      <span>You don't have any modules to see yet.</span>
                      <Button size="sm" onClick={() => openFormDialog({ mode: "create" })}>
                        <Plus className="h-4 w-4" />
                        Create your first module
                      </Button>
                    </div>
                  ) : (
                    <div className="flex h-24 items-center justify-center">No modules yet.</div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {filteredModules.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            <span className="text-foreground">
              {(safePage - 1) * PAGE_SIZE + 1}-
              {Math.min(safePage * PAGE_SIZE, filteredModules.length)}
            </span>{" "}
            of <span className="text-foreground">{filteredModules.length}</span>
          </p>

          <Pagination className="mx-0 w-fit">
            <PaginationContent>
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={safePage === 1}
                  aria-label="Go to previous page"
                >
                  ←
                </Button>
              </PaginationItem>

              {showLeftEllipsis && (
                <>
                  <PaginationItem>
                    <PaginationLink onClick={() => setCurrentPage(1)}>1</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                </>
              )}

              {pages.map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink onClick={() => setCurrentPage(page)} isActive={safePage === page}>
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}

              {showRightEllipsis && (
                <>
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink onClick={() => setCurrentPage(totalPages)}>
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                </>
              )}

              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={safePage === totalPages}
                  aria-label="Go to next page"
                >
                  →
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
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
          showToast(
            apiMessage,
            mode === "create"
              ? `${savedModule.name} has been created.`
              : `${savedModule.name}'s details have been saved.`,
          )
        }
      />

      <DeactivateModuleDialog
        module={deactivateTarget}
        open={deactivateTarget !== null}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        onSuccess={(action, targetModule, apiMessage) =>
          showToast(
            apiMessage,
            action === "deactivated"
              ? `${targetModule.name} is now marked inactive.`
              : `${targetModule.name} is active again.`,
          )
        }
      />

      {toast && (
        <Alert
          key={toast.id}
          variant="toast"
          status="success"
          title={toast.title}
          reducedMotion
          timeout={6000}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
