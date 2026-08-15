import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Plus, Upload, Users } from "lucide-react";

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
import { PageHeader } from "~/components/ui/page-header";
import { usePermission } from "~/features/auth/api/auth-context";
import { useUsers } from "~/features/users/api/use-users";
import { BulkImportDialog } from "~/features/users/components/bulk-import-dialog";
import { CreateUserDialog } from "~/features/users/components/create-user-dialog";
import type { User } from "~/features/users/types";
import { backTo } from "~/hooks/use-back-link";
import { usePagedList } from "~/hooks/use-paged-list";
import { formatDateTime, pluralise } from "~/utils/format";

type StatusFilter = "all" | "active" | "deactivated";

const STATUS_FILTERS: FilterTabOption<StatusFilter>[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "deactivated", label: "Deactivated" },
];

/**
 * Staff accounts. Deactivated rather than deleted, so somebody who has marked anything
 * stays readable, and the list keeps them visible under their own filter.
 */
export function UsersPage() {
  const canCreate = usePermission("user.create");
  const { data, isLoading, isError, error, refetch, isFetching } = useUsers();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((user) => {
      const matchesStatus =
        status === "all" ||
        (status === "active" && user.isActive) ||
        (status === "deactivated" && !user.isActive);
      const matchesTerm =
        !term || `${user.fullName} ${user.email}`.toLowerCase().includes(term);
      return matchesStatus && matchesTerm;
    });
  }, [data, search, status]);

  const paged = usePagedList(filtered, 20);
  const backHere = backTo({
    to: paged.page > 1 ? `/admin/users?page=${paged.page}` : "/admin/users",
    label: "accounts",
  });

  const columns: DataTableColumn<User>[] = [
    {
      id: "user",
      header: "Person",
      cell: (user) => (
        <div className="min-w-0">
          <Link
            to={`/admin/users/${user.id}`}
            state={backHere}
            className="block truncate font-medium underline-offset-4 hover:underline"
          >
            {user.fullName}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      ),
      skeletonClassName: "w-44",
    },
    {
      id: "status",
      header: "Status",
      cell: (user) => (
        <div className="flex flex-wrap gap-1">
          {user.isActive ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="outline">Deactivated</Badge>
          )}
          {user.mustChangePassword && <Badge variant="warning">Temporary password</Badge>}
        </div>
      ),
      skeletonClassName: "w-20",
    },
    {
      id: "lastLogin",
      header: "Last signed in",
      cell: (user) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}
        </span>
      ),
      className: "hidden lg:table-cell",
      skeletonClassName: "w-32",
    },
  ];

  const renderCard = (user: User) => (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/admin/users/${user.id}`}
            state={backHere}
            className="block truncate font-medium underline-offset-4 hover:underline"
          >
            {user.fullName}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        {user.isActive ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="outline">Deactivated</Badge>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">Last signed in</span>
        <span>{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}</span>
      </div>
    </div>
  );

  const hasFilters = search.trim() !== "" || status !== "all";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        description="Staff accounts and the roles they hold. Students never sign in, so nobody here is a student."
        actions={
          canCreate && (
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                variant="outline"
                className="h-11 flex-1 cursor-pointer sm:h-9 sm:flex-none"
                onClick={() => setImportOpen(true)}
              >
                <Upload className="size-4" aria-hidden="true" />
                Import
              </Button>
              <Button
                className="h-11 flex-1 cursor-pointer sm:h-9 sm:flex-none"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="size-4" aria-hidden="true" />
                New account
              </Button>
            </div>
          )
        }
      />

      {isError ? (
        <ErrorCard
          title="Could not load accounts"
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      ) : (
        <>
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchLabel="Search accounts by name or email"
            placeholder="Search accounts"
            filters={
              <FilterTabs
                options={STATUS_FILTERS}
                value={status}
                onChange={setStatus}
                label="Filter by account status"
              />
            }
          />

          <DataTable
            columns={columns}
            rows={paged.rows}
            getRowId={(user) => user.id}
            renderCard={renderCard}
            isLoading={isLoading}
            caption="Staff accounts"
            empty={
              <Card>
                <CardContent className="py-4">
                  <Empty className="px-0">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Users aria-hidden="true" />
                      </EmptyMedia>
                      <EmptyTitle>
                        {hasFilters ? "No accounts match" : "No accounts visible"}
                      </EmptyTitle>
                      <EmptyDescription>
                        {hasFilters
                          ? "Try a different search term, or clear the filters."
                          : "This list is narrowed to the people your own roles reach, so an empty list can mean your scope covers nobody yet."}
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
                          onClick={() => setCreateOpen(true)}
                        >
                          <Plus className="size-4" aria-hidden="true" />
                          New account
                        </Button>
                      )
                    )}
                  </Empty>
                </CardContent>
              </Card>
            }
          />

          {!isLoading && paged.total > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {pluralise(paged.total, "account")}
                {paged.pageCount > 1 && ` · page ${paged.page} of ${paged.pageCount}`}
              </p>
              <ListPager
                page={paged.page}
                pageCount={paged.pageCount}
                onPageChange={paged.setPage}
              />
            </div>
          )}
        </>
      )}

      {createOpen && <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />}
      {importOpen && <BulkImportDialog open={importOpen} onOpenChange={setImportOpen} />}
    </div>
  );
}
