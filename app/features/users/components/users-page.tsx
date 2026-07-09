import { CheckCircle2, MoreHorizontal, Plus, Search } from "lucide-react";
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
import { useUsers } from "~/features/users/api/use-users";
import { DeactivateUserDialog } from "~/features/users/components/deactivate-user-dialog";
import { UserFormDialog } from "~/features/users/components/user-form-dialog";
import type { UserResponse } from "~/features/users/types";
import { ApiError } from "~/lib/api-client";

const PAGE_SIZE = 10;
const PAGINATION_ITEMS_TO_DISPLAY = 5;

const ROLE_LABELS: Record<UserResponse["role"], string> = {
  coordinator: "Coordinator",
  marker: "Marker",
  super_admin: "Super Admin",
};

type FormDialogState =
  { mode: "create" } | { mode: "edit"; user: UserResponse } | null;

export function UsersPage() {
  const { data: users, isLoading, isError, error } = useUsers();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [formDialog, setFormDialog] = useState<FormDialogState>(null);
  // Bumped every time the form dialog opens, and used as UserFormDialog's `key` below — forces a
  // fresh mount (fresh form/mutation state) on every open instead of an effect-based reset.
  const [formDialogNonce, setFormDialogNonce] = useState(0);
  const [deactivateTarget, setDeactivateTarget] = useState<UserResponse | null>(
    null,
  );
  // `id` changes on every call so a repeat of the same title/message still
  // remounts the toast (Alert's own re-trigger convention — see Alert.md).
  const [toast, setToast] = useState<{
    id: number;
    title: string;
    message: string;
  } | null>(null);

  function openFormDialog(state: FormDialogState) {
    setFormDialog(state);
    setFormDialogNonce((n) => n + 1);
  }

  function showToast(title: string, message: string) {
    setToast({ id: Date.now(), title, message });
  }

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter(
      (user) =>
        user.fullName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query),
    );
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage: safePage,
    totalPages,
    paginationItemsToDisplay: PAGINATION_ITEMS_TO_DISPLAY,
  });
  const pageRows = filteredUsers.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    setCurrentPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-foreground">Users</h1>
        <Button onClick={() => openFormDialog({ mode: "create" })}>
          <Plus className="h-4 w-4" />
          Add user
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
        <Input
          type="search"
          placeholder="Search by name or email"
          className="pl-9"
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
          aria-label="Search users"
        />
      </div>

      {isError && (
        <Alert
          variant="inline"
          timeout={0}
          title="Couldn't load users"
          message={
            error instanceof ApiError
              ? error.message
              : "Something went wrong. Please try again."
          }
        />
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Learn ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Loading users...
                </TableCell>
              </TableRow>
            ) : pageRows.length ? (
              pageRows.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{ROLE_LABELS[user.role]}</TableCell>
                  <TableCell>{user.learnId ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "outline"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Actions for ${user.fullName}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() =>
                            openFormDialog({ mode: "edit", user })
                          }
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => setDeactivateTarget(user)}
                        >
                          {user.isActive ? "Deactivate" : "Reactivate"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  {search ? "No users match your search." : "No users yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {filteredUsers.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            <span className="text-foreground">
              {(safePage - 1) * PAGE_SIZE + 1}-
              {Math.min(safePage * PAGE_SIZE, filteredUsers.length)}
            </span>{" "}
            of <span className="text-foreground">{filteredUsers.length}</span>
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
                    <PaginationLink onClick={() => setCurrentPage(1)}>
                      1
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                </>
              )}

              {pages.map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => setCurrentPage(page)}
                    isActive={safePage === page}
                  >
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
                  onClick={() =>
                    setCurrentPage((p) => Math.min(p + 1, totalPages))
                  }
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

      <UserFormDialog
        key={formDialogNonce}
        open={formDialog !== null}
        onOpenChange={(open) => !open && setFormDialog(null)}
        mode={formDialog?.mode ?? "create"}
        user={formDialog?.mode === "edit" ? formDialog.user : undefined}
        onSuccess={(mode, savedUser, apiMessage) =>
          showToast(
            apiMessage,
            mode === "create"
              ? `${savedUser.fullName} can now sign in with their temporary password.`
              : `${savedUser.fullName}'s details have been saved.`,
          )
        }
      />

      <DeactivateUserDialog
        user={deactivateTarget}
        open={deactivateTarget !== null}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        onSuccess={(action, targetUser, apiMessage) =>
          showToast(
            apiMessage,
            action === "deactivated"
              ? `${targetUser.fullName} can no longer sign in.`
              : `${targetUser.fullName} can sign in again.`,
          )
        }
      />

      {toast && (
        <Alert
          key={toast.id}
          variant="toast"
          icon={<CheckCircle2 className="h-5 w-5" aria-hidden />}
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
