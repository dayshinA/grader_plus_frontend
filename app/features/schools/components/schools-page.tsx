import { Landmark, MoreHorizontal, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
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
import { useAuth } from "~/features/auth/api/auth-context";
import { findNavItem } from "~/features/dashboard/nav";
import { hasPermission } from "~/features/permissions/utils";
import { useSchools } from "~/features/schools/api/use-schools";
import { DeactivateSchoolDialog } from "~/features/schools/components/deactivate-school-dialog";
import { SchoolFormDialog } from "~/features/schools/components/school-form-dialog";
import type { SchoolResponse } from "~/features/schools/types";
import { usePagedList } from "~/hooks/use-paged-list";

type FormDialogState = { mode: "create" } | { mode: "edit"; school: SchoolResponse } | null;
type StatusFilter = "all" | "active" | "inactive";

const STATUS_FILTERS: FilterTabOption<StatusFilter>[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

const nav = findNavItem("/super-admin/schools");

/** System Administrator CRUD screen for `schools` — direct structural mirror of `DepartmentsPage`, one
 * level up the hierarchy (see SYSTEM_DESIGN.md decision #37). */
export function SchoolsPage() {
  // Capability, not identity. The nav entry for this screen is `superAdminOnly`, but the route
  // itself only sits behind `require-admin`'s any-of gate — a School Admin holding `roles.assign`
  // can reach this URL directly, and `GET /schools` self-filters to their own school rather than
  // 403ing, so the table populates. They hold `schools.view`/`schools.view_detail` and none of
  // the writes, so every write control is gated on the permission its request needs.
  const { permissions: summary } = useAuth();
  const canCreate = hasPermission(summary, "schools.create");
  const canUpdate = hasPermission(summary, "schools.update");
  const canDeactivate = hasPermission(summary, "schools.deactivate");

  const { data: schools, isLoading, isError, error, refetch, isFetching } = useSchools();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [formDialog, setFormDialog] = useState<FormDialogState>(null);
  // Bumped every time the form dialog opens, and used as SchoolFormDialog's `key` below —
  // forces a fresh mount (fresh form/mutation state) on every open instead of an effect-based reset.
  const [formDialogNonce, setFormDialogNonce] = useState(0);
  const [deactivateTarget, setDeactivateTarget] = useState<SchoolResponse | null>(null);

  function openFormDialog(state: FormDialogState) {
    setFormDialog(state);
    setFormDialogNonce((n) => n + 1);
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (schools ?? []).filter(
      (school) =>
        (status === "all" || (status === "active") === school.isActive) &&
        (query === "" ||
          school.name.toLowerCase().includes(query) ||
          school.code.toLowerCase().includes(query)),
    );
  }, [schools, search, status]);

  const { rows, page, pageCount, setPage, total } = usePagedList(filtered);
  const hasFilters = search.trim() !== "" || status !== "all";

  function rowActions(school: SchoolResponse) {
    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer"
            aria-label={`Actions for ${school.name}`}
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canUpdate && (
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => openFormDialog({ mode: "edit", school })}
            >
              Edit
            </DropdownMenuItem>
          )}
          {/* "Manage admins" is gone with CH-06 — delegation is user-centric now, not
              school-centric. See departments-page.tsx for the same note. */}
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link to={`/super-admin/departments?schoolId=${school.id}`}>View departments</Link>
          </DropdownMenuItem>
          {canDeactivate && (
            <DropdownMenuItem
              className="cursor-pointer"
              variant={school.isActive ? "destructive" : "default"}
              onSelect={() => setDeactivateTarget(school)}
            >
              {school.isActive ? "Deactivate" : "Reactivate"}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const columns: DataTableColumn<SchoolResponse>[] = [
    {
      id: "code",
      header: "Code",
      cell: (school) => <span className="font-medium text-foreground">{school.code}</span>,
      skeletonClassName: "w-16",
    },
    {
      id: "name",
      header: "Name",
      cell: (school) => <span className="text-foreground">{school.name}</span>,
      skeletonClassName: "w-48",
    },
    {
      id: "status",
      header: "Status",
      cell: (school) => (
        <Badge variant={school.isActive ? "success" : "outline"}>
          {school.isActive ? "Active" : "Inactive"}
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

  const renderCard = (school: SchoolResponse) => (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{school.name}</p>
          <p className="truncate text-xs text-muted-foreground">{school.code}</p>
        </div>
        {rowActions(school)}
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <Badge variant={school.isActive ? "success" : "outline"}>
          {school.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schools"
        description={nav?.description}
        actions={
          canCreate && (
            <Button
              className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto"
              onClick={() => openFormDialog({ mode: "create" })}
            >
              <Plus aria-hidden="true" />
              Add school
            </Button>
          )
        }
      />

      {isError ? (
        <ErrorCard
          title="Couldn't load schools"
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
            searchLabel="Search schools by code or name"
            filters={
              <FilterTabs
                options={STATUS_FILTERS}
                value={status}
                onChange={setStatus}
                label="Filter by status"
              />
            }
          />

          <div className="space-y-4">
            <DataTable
              columns={columns}
              rows={rows}
              getRowId={(school) => school.id}
              renderCard={renderCard}
              isLoading={isLoading}
              caption="Schools on the platform"
              empty={
                <Card>
                  <CardContent className="py-4">
                    <Empty className="px-0">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Landmark aria-hidden="true" />
                        </EmptyMedia>
                        <EmptyTitle>{hasFilters ? "No matches" : "No schools yet"}</EmptyTitle>
                        <EmptyDescription>
                          {hasFilters
                            ? "Try a different search term, or clear the filters."
                            : "A school has to exist before any department can be created under it."}
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
                        canCreate && (
                          <Button
                            className="h-11 cursor-pointer sm:h-9"
                            onClick={() => openFormDialog({ mode: "create" })}
                          >
                            <Plus aria-hidden="true" />
                            Add school
                          </Button>
                        )
                      )}
                    </Empty>
                  </CardContent>
                </Card>
              }
            />

            {!isLoading && rows.length > 0 && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {total} {total === 1 ? "school" : "schools"}
                  {pageCount > 1 && ` · page ${page} of ${pageCount}`}
                </p>
                <ListPager page={page} pageCount={pageCount} onPageChange={setPage} />
              </div>
            )}
          </div>
        </>
      )}

      <SchoolFormDialog
        key={formDialogNonce}
        open={formDialog !== null}
        onOpenChange={(open) => !open && setFormDialog(null)}
        mode={formDialog?.mode ?? "create"}
        school={formDialog?.mode === "edit" ? formDialog.school : undefined}
        onSuccess={(mode, savedSchool, apiMessage) =>
          toast.success(apiMessage, {
            description:
              mode === "create"
                ? `${savedSchool.name} can now be assigned departments and a School Admin.`
                : `${savedSchool.name}'s details have been saved.`,
          })
        }
      />

      <DeactivateSchoolDialog
        school={deactivateTarget}
        open={deactivateTarget !== null}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        onSuccess={(action, targetSchool, apiMessage) =>
          toast.success(apiMessage, {
            description:
              action === "deactivated"
                ? `${targetSchool.name} is now marked inactive.`
                : `${targetSchool.name} is active again.`,
          })
        }
      />
    </div>
  );
}
