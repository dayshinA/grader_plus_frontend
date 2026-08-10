import { Building2, Landmark, MoreHorizontal, Plus } from "lucide-react";
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
import { findNavItem } from "~/features/dashboard/nav";
import { useDepartments } from "~/features/departments/api/use-departments";
import { DeactivateDepartmentDialog } from "~/features/departments/components/deactivate-department-dialog";
import { DepartmentFormDialog } from "~/features/departments/components/department-form-dialog";
import type { DepartmentResponse } from "~/features/departments/types";
import { useSchools } from "~/features/schools/api/use-schools";
import { usePagedList } from "~/hooks/use-paged-list";

type FormDialogState =
  | { mode: "create" }
  | { mode: "edit"; department: DepartmentResponse }
  | null;
type StatusFilter = "all" | "active" | "inactive";

const STATUS_FILTERS: FilterTabOption<StatusFilter>[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

const nav = findNavItem("/super-admin/departments");

export function DepartmentsPage() {
  const { data: departments, isLoading, isError, error, refetch, isFetching } = useDepartments();
  const { data: schools } = useSchools();
  const [searchParams, setSearchParams] = useSearchParams();
  // School-first browsing (2026-08-05, Dayshin's call): pick a school, then see its departments —
  // same required-selection-before-list pattern as the Role Assignments screen's user picker.
  // Still deep-linkable from SchoolsPage's "View departments" row action, which sets the same
  // `?schoolId=` param to pre-select a school rather than land on an empty picker.
  const schoolId = searchParams.get("schoolId");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [formDialog, setFormDialog] = useState<FormDialogState>(null);
  // Bumped every time the form dialog opens, and used as DepartmentFormDialog's `key` below —
  // forces a fresh mount (fresh form/mutation state) on every open instead of an effect-based reset.
  const [formDialogNonce, setFormDialogNonce] = useState(0);
  const [deactivateTarget, setDeactivateTarget] = useState<DepartmentResponse | null>(null);

  function openFormDialog(state: FormDialogState) {
    setFormDialog(state);
    setFormDialogNonce((n) => n + 1);
  }

  function handleSchoolChange(nextSchoolId: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("schoolId", nextSchoolId);
        // A different school is a different list — page 3 of the old one means nothing here.
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  }

  const schoolOptions = useMemo(
    () => (schools ?? []).map((school) => ({ id: school.id, label: school.name })),
    [schools],
  );

  const selectedSchool = useMemo(
    () => schools?.find((school) => school.id === schoolId),
    [schools, schoolId],
  );

  const filtered = useMemo(() => {
    if (!departments || !schoolId) return [];
    const query = search.trim().toLowerCase();
    return departments.filter(
      (department) =>
        department.schoolId === schoolId &&
        (status === "all" || (status === "active") === department.isActive) &&
        (query === "" ||
          department.name.toLowerCase().includes(query) ||
          department.code.toLowerCase().includes(query)),
    );
  }, [departments, schoolId, search, status]);

  const { rows, page, pageCount, setPage, total } = usePagedList(filtered);
  const hasFilters = search.trim() !== "" || status !== "all";

  function rowActions(department: DepartmentResponse) {
    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer"
            aria-label={`Actions for ${department.name}`}
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => openFormDialog({ mode: "edit", department })}
          >
            Edit
          </DropdownMenuItem>
          {/* The "Manage admins" and "Manage module-creation grants" actions are gone with
              CH-07/CH-08: delegation is no longer scope-centric (pick a department, then manage
              its admins) but user-centric (pick a person, then manage every role they hold).
              There is no department-filtered view of /super-admin/role-assignments to link to —
              see decision #42. */}
          <DropdownMenuItem
            className="cursor-pointer"
            variant={department.isActive ? "destructive" : "default"}
            onSelect={() => setDeactivateTarget(department)}
          >
            {department.isActive ? "Deactivate" : "Reactivate"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const columns: DataTableColumn<DepartmentResponse>[] = [
    {
      id: "code",
      header: "Code",
      cell: (department) => <span className="font-medium text-foreground">{department.code}</span>,
      skeletonClassName: "w-16",
    },
    {
      id: "name",
      header: "Name",
      cell: (department) => <span className="text-foreground">{department.name}</span>,
      skeletonClassName: "w-48",
    },
    {
      id: "status",
      header: "Status",
      cell: (department) => (
        <Badge variant={department.isActive ? "success" : "outline"}>
          {department.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
      skeletonClassName: "w-16",
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "end",
      cell: rowActions,
      className: "w-12",
      skeletonClassName: "size-8 rounded-md",
    },
  ];

  const renderCard = (department: DepartmentResponse) => (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{department.name}</p>
          <p className="truncate text-xs text-muted-foreground">{department.code}</p>
        </div>
        {rowActions(department)}
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <Badge variant={department.isActive ? "success" : "outline"}>
          {department.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description={nav?.description}
        actions={
          <Button
            className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto"
            disabled={!schoolId}
            onClick={() => openFormDialog({ mode: "create" })}
          >
            <Plus aria-hidden="true" />
            Add department
          </Button>
        }
      />

      {isError ? (
        <ErrorCard
          title="Couldn't load departments"
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:max-w-xs">
              <Select value={schoolId ?? undefined} onValueChange={handleSchoolChange}>
                <SelectTrigger aria-label="Select a school">
                  <SelectValue placeholder="Select a school" />
                </SelectTrigger>
                <SelectContent>
                  {schoolOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {schoolId && (
              <ListToolbar
                className="flex-1"
                search={search}
                onSearchChange={setSearch}
                placeholder="Search by code or name"
                searchLabel="Search departments by code or name"
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

          {!schoolId ? (
            <Card>
              <CardContent className="py-4">
                <Empty className="px-0">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Landmark aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>Pick a school</EmptyTitle>
                    <EmptyDescription>
                      Departments belong to a school. Choose one above to see and manage its
                      departments.
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
                getRowId={(department) => department.id}
                renderCard={renderCard}
                isLoading={isLoading}
                caption={`Departments in ${selectedSchool?.name ?? "the selected school"}`}
                empty={
                  <Card>
                    <CardContent className="py-4">
                      <Empty className="px-0">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <Building2 aria-hidden="true" />
                          </EmptyMedia>
                          <EmptyTitle>
                            {hasFilters ? "No matches" : "No departments yet"}
                          </EmptyTitle>
                          <EmptyDescription>
                            {hasFilters
                              ? "Try a different search term, or clear the filters."
                              : `${selectedSchool?.name ?? "This school"} has no departments yet. A department has to exist before any module can be created under it.`}
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
                        ) : (
                          <Button
                            className="h-11 cursor-pointer sm:h-9"
                            onClick={() => openFormDialog({ mode: "create" })}
                          >
                            <Plus aria-hidden="true" />
                            Add department
                          </Button>
                        )}
                      </Empty>
                    </CardContent>
                  </Card>
                }
              />

              {!isLoading && rows.length > 0 && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground" aria-live="polite">
                    {total} {total === 1 ? "department" : "departments"}
                    {pageCount > 1 && ` · page ${page} of ${pageCount}`}
                  </p>
                  <ListPager page={page} pageCount={pageCount} onPageChange={setPage} />
                </div>
              )}
            </div>
          )}
        </>
      )}

      <DepartmentFormDialog
        key={formDialogNonce}
        open={formDialog !== null}
        onOpenChange={(open) => !open && setFormDialog(null)}
        mode={formDialog?.mode ?? "create"}
        department={formDialog?.mode === "edit" ? formDialog.department : undefined}
        schoolOptions={schoolOptions}
        defaultSchoolId={schoolId ?? undefined}
        onSuccess={(mode, savedDepartment, apiMessage) =>
          toast.success(apiMessage, {
            description:
              mode === "create"
                ? `${savedDepartment.name} can now be assigned modules and a Department Admin.`
                : `${savedDepartment.name}'s details have been saved.`,
          })
        }
      />

      <DeactivateDepartmentDialog
        department={deactivateTarget}
        open={deactivateTarget !== null}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        onSuccess={(action, targetDepartment, apiMessage) =>
          toast.success(apiMessage, {
            description:
              action === "deactivated"
                ? `${targetDepartment.name} is now marked inactive.`
                : `${targetDepartment.name} is active again.`,
          })
        }
      />
    </div>
  );
}
