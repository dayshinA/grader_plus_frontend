import { MoreHorizontal, Plus, Upload, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
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
import { useUsers } from "~/features/users/api/use-users";
import { DeactivateUserDialog } from "~/features/users/components/deactivate-user-dialog";
import type { UserResponse } from "~/features/users/types";
import { backTo } from "~/hooks/use-back-link";
import { usePagedList } from "~/hooks/use-paged-list";
import { is403 } from "~/lib/api-client";

type StatusFilter = "all" | "active" | "inactive";

const STATUS_FILTERS: FilterTabOption<StatusFilter>[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

const nav = findNavItem("/super-admin/users");

/** The toast a create/edit page hands back through router state on its redirect. */
interface HandoffToast {
  title: string;
  message: string;
}

export function UsersPage() {
  // Capability, not identity. This screen is reachable on `users.view` OR `users.create`
  // (nav.ts, require-admin.tsx), so a School Admin, a Department Admin and a module-scoped
  // Coordinator all land here holding different subsets of the Users permissions — none of
  // them hold `users.bulk_import`, which is System-Administrator-only, and Department Admin
  // holds `users.update` but not `users.deactivate`. Every control below is gated on the
  // permission its request actually needs, so nobody is offered a button that always 403s.
  const { permissions: summary } = useAuth();
  const canCreate = hasPermission(summary, "users.create");
  const canBulkImport = hasPermission(summary, "users.bulk_import");
  const canUpdate = hasPermission(summary, "users.update");
  const canDeactivate = hasPermission(summary, "users.deactivate");

  const { data: users, isLoading, isError, error, refetch, isFetching } = useUsers();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [deactivateTarget, setDeactivateTarget] = useState<UserResponse | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  // Create/edit are full pages (2026-08-04, converted from UserFormDialog) — there's no shared
  // parent left to lift an onSuccess callback into, so the confirmation rides across the redirect
  // in router `state`. Fired once on mount and the history entry's state cleared straight after,
  // so a later back/forward landing on this exact entry doesn't resurface the same toast.
  useEffect(() => {
    const handoff = (location.state as { toast?: HandoffToast } | null)?.toast;
    if (handoff) toast.success(handoff.title, { description: handoff.message });
    if (location.state) navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (users ?? []).filter(
      (user) =>
        (status === "all" || (status === "active") === user.isActive) &&
        (query === "" ||
          user.fullName.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)),
    );
  }, [users, search, status]);

  const { rows, page, pageCount, setPage, total } = usePagedList(filtered);
  const hasFilters = search.trim() !== "" || status !== "all";

  // Where a user row hands the detail screen its back link, so coming back lands on the page of
  // the list the admin was actually on.
  const backHere = backTo({
    to: page > 1 ? `/super-admin/users?page=${page}` : "/super-admin/users",
    label: "Users",
  });

  // CH-17: GET /users (users.view) 403s for a School/Department Admin who only holds
  // users.create (SYSTEM_DESIGN.md decision #42) — that renders as this screen's own empty
  // state, with a "create your first user" affordance, not an error card.
  const isForbidden = isError && is403(error);

  function rowActions(user: UserResponse) {
    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer"
            aria-label={`Actions for ${user.fullName}`}
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link to={`/super-admin/users/${user.id}`} state={backHere}>
              View
            </Link>
          </DropdownMenuItem>
          {canUpdate && (
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link to={`/super-admin/users/${user.id}/edit`} state={backHere}>
                Edit
              </Link>
            </DropdownMenuItem>
          )}
          {canDeactivate && (
            <DropdownMenuItem
              className="cursor-pointer"
              variant={user.isActive ? "destructive" : "default"}
              onSelect={() => setDeactivateTarget(user)}
            >
              {user.isActive ? "Deactivate" : "Reactivate"}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const columns: DataTableColumn<UserResponse>[] = [
    {
      id: "name",
      header: "Name",
      cell: (user) => (
        <Link
          to={`/super-admin/users/${user.id}`}
          state={backHere}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {user.fullName}
        </Link>
      ),
      skeletonClassName: "w-36",
    },
    {
      id: "email",
      header: "Email",
      cell: (user) => <span className="text-muted-foreground">{user.email}</span>,
      className: "hidden md:table-cell",
      skeletonClassName: "w-48",
    },
    {
      id: "learnId",
      header: "Learn ID",
      cell: (user) => <span className="text-muted-foreground">{user.learnId ?? "—"}</span>,
      className: "hidden lg:table-cell",
      skeletonClassName: "w-20",
    },
    {
      id: "status",
      header: "Status",
      cell: (user) => (
        <Badge variant={user.isActive ? "success" : "outline"}>
          {user.isActive ? "Active" : "Inactive"}
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

  const renderCard = (user: UserResponse) => (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/super-admin/users/${user.id}`}
            state={backHere}
            className="block truncate font-medium text-foreground underline-offset-4 hover:underline"
          >
            {user.fullName}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        {rowActions(user)}
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <Badge variant={user.isActive ? "success" : "outline"}>
          {user.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description={nav?.description}
        actions={
          <>
            {canBulkImport && (
              <Button variant="outline" asChild className="h-11 cursor-pointer sm:h-9">
                <Link to="/super-admin/users/bulk-import">
                  <Upload aria-hidden="true" />
                  Bulk import
                </Link>
              </Button>
            )}
            {canCreate && (
              <Button asChild className="h-11 cursor-pointer sm:h-9">
                <Link to="/super-admin/users/new">
                  <Plus aria-hidden="true" />
                  Add user
                </Link>
              </Button>
            )}
          </>
        }
      />

      {isError && !isForbidden ? (
        <ErrorCard
          title="Couldn't load users"
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      ) : (
        <>
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search by name or email"
            searchLabel="Search users by name or email"
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
              getRowId={(user) => user.id}
              renderCard={renderCard}
              isLoading={isLoading}
              caption="Staff accounts on the platform"
              empty={
                <Card>
                  <CardContent className="py-4">
                    <Empty className="px-0">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Users aria-hidden="true" />
                        </EmptyMedia>
                        <EmptyTitle>{hasFilters ? "No matches" : "No users to show"}</EmptyTitle>
                        <EmptyDescription>
                          {hasFilters
                            ? "Try a different search term, or clear the filters."
                            : isForbidden
                              ? "You can create accounts, but you don't have permission to browse the full user list."
                              : canBulkImport
                                ? "Add staff one at a time, or bring a whole cohort in with a bulk import."
                                : "Add staff one at a time."}
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
                          <Button asChild className="h-11 cursor-pointer sm:h-9">
                            <Link to="/super-admin/users/new">
                              <Plus aria-hidden="true" />
                              Add user
                            </Link>
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
                  {total} {total === 1 ? "user" : "users"}
                  {pageCount > 1 && ` · page ${page} of ${pageCount}`}
                </p>
                <ListPager page={page} pageCount={pageCount} onPageChange={setPage} />
              </div>
            )}
          </div>
        </>
      )}

      <DeactivateUserDialog
        user={deactivateTarget}
        open={deactivateTarget !== null}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        onSuccess={(action, targetUser, apiMessage) =>
          toast.success(apiMessage, {
            description:
              action === "deactivated"
                ? `${targetUser.fullName} can no longer sign in.`
                : `${targetUser.fullName} can sign in again.`,
          })
        }
      />
    </div>
  );
}
