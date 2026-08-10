import { Building2, Landmark, Plus } from "lucide-react";
import { useMemo, useState } from "react";
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
import { ListPager } from "~/components/ui/list-pager";
import { ListToolbar } from "~/components/ui/list-toolbar";
import { PageHeader } from "~/components/ui/page-header";
import { findNavItem } from "~/features/dashboard/nav";
import { useDepartments } from "~/features/departments/api/use-departments";
import { DepartmentFormDialog } from "~/features/departments/components/department-form-dialog";
import type { DepartmentResponse } from "~/features/departments/types";
import { useSchools } from "~/features/schools/api/use-schools";
import { usePagedList } from "~/hooks/use-paged-list";

const nav = findNavItem("/workspace/school-settings");

/**
 * The FR43 "create a Department directly within my school" surface for a School Admin. There's no
 * edit action to offer here: `PATCH /departments/:departmentId` stays System-Administrator-only
 * regardless of who created the department, so this panel is read-mostly plus a create action.
 */
export function SchoolAdminDepartmentsPanel() {
  const { data: schools } = useSchools();
  const { data: departments, isLoading, isError, error, refetch, isFetching } = useDepartments();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogNonce, setCreateDialogNonce] = useState(0);
  const [search, setSearch] = useState("");

  const adminSchools = useMemo(
    () => (schools ?? []).filter((school) => school.isAdmin === true),
    [schools],
  );
  const schoolOptions = useMemo(
    () => adminSchools.map((school) => ({ id: school.id, label: school.name })),
    [adminSchools],
  );
  const adminSchoolIds = useMemo(
    () => new Set(adminSchools.map((school) => school.id)),
    [adminSchools],
  );
  const schoolsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const school of adminSchools) map.set(school.id, school.name);
    return map;
  }, [adminSchools]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (departments ?? []).filter(
      (department) =>
        adminSchoolIds.has(department.schoolId) &&
        (query === "" ||
          department.name.toLowerCase().includes(query) ||
          department.code.toLowerCase().includes(query)),
    );
  }, [departments, adminSchoolIds, search]);

  const { rows, page, pageCount, setPage, total } = usePagedList(filtered);
  const hasFilters = search.trim() !== "";

  function openCreate() {
    setCreateDialogOpen(true);
    setCreateDialogNonce((n) => n + 1);
  }

  if (adminSchools.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="School Settings" description={nav?.description} />
        <Card>
          <CardContent className="py-4">
            <Empty className="px-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Landmark aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No school to create departments in</EmptyTitle>
                <EmptyDescription>
                  You don't administer any school yet — ask a System Administrator to grant you
                  School Admin access first.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      </div>
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
      id: "school",
      header: "School",
      cell: (department) => (
        <span className="text-muted-foreground">
          {schoolsById.get(department.schoolId) ?? "—"}
        </span>
      ),
      className: "hidden md:table-cell",
      skeletonClassName: "w-32",
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
  ];

  const renderCard = (department: DepartmentResponse) => (
    <div className="rounded-xl border border-border p-4">
      <p className="truncate font-medium text-foreground">{department.name}</p>
      <p className="truncate text-xs text-muted-foreground">
        {department.code} · {schoolsById.get(department.schoolId) ?? "—"}
      </p>
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
        title="School Settings"
        description="Departments within the school(s) you administer."
        actions={
          <Button className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto" onClick={openCreate}>
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
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search by code or name"
            searchLabel="Search your departments by code or name"
          />

          <div className="space-y-4">
            <DataTable
              columns={columns}
              rows={rows}
              getRowId={(department) => department.id}
              renderCard={renderCard}
              isLoading={isLoading}
              caption="Departments in the schools you administer"
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
                            ? "Try a different search term."
                            : "Create a department to start setting up modules under it."}
                        </EmptyDescription>
                      </EmptyHeader>
                      {hasFilters ? (
                        <Button
                          variant="outline"
                          className="h-11 cursor-pointer sm:h-9"
                          onClick={() => setSearch("")}
                        >
                          Clear search
                        </Button>
                      ) : (
                        <Button className="h-11 cursor-pointer sm:h-9" onClick={openCreate}>
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
        </>
      )}

      <DepartmentFormDialog
        key={createDialogNonce}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        mode="create"
        schoolOptions={schoolOptions}
        onSuccess={(_mode, savedDepartment, apiMessage) =>
          toast.success(apiMessage, {
            description: `${savedDepartment.name} can now be assigned modules and a Department Admin.`,
          })
        }
      />
    </div>
  );
}
