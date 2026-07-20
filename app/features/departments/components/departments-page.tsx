import { MoreHorizontal, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";

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
import { useDepartments } from "~/features/departments/api/use-departments";
import { DeactivateDepartmentDialog } from "~/features/departments/components/deactivate-department-dialog";
import { DepartmentFormDialog } from "~/features/departments/components/department-form-dialog";
import type { DepartmentResponse } from "~/features/departments/types";
import { ApiError } from "~/lib/api-client";

const PAGE_SIZE = 10;
const PAGINATION_ITEMS_TO_DISPLAY = 5;

type FormDialogState =
  | { mode: "create" }
  | { mode: "edit"; department: DepartmentResponse }
  | null;

export function DepartmentsPage() {
  const { data: departments, isLoading, isError, error } = useDepartments();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [formDialog, setFormDialog] = useState<FormDialogState>(null);
  // Bumped every time the form dialog opens, and used as DepartmentFormDialog's `key` below —
  // forces a fresh mount (fresh form/mutation state) on every open instead of an effect-based reset.
  const [formDialogNonce, setFormDialogNonce] = useState(0);
  const [deactivateTarget, setDeactivateTarget] = useState<DepartmentResponse | null>(null);
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

  const filteredDepartments = useMemo(() => {
    if (!departments) return [];
    const query = search.trim().toLowerCase();
    if (!query) return departments;
    return departments.filter(
      (department) =>
        department.name.toLowerCase().includes(query) ||
        department.code.toLowerCase().includes(query),
    );
  }, [departments, search]);

  const totalPages = Math.max(1, Math.ceil(filteredDepartments.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage: safePage,
    totalPages,
    paginationItemsToDisplay: PAGINATION_ITEMS_TO_DISPLAY,
  });
  const pageRows = filteredDepartments.slice(
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
        <h1 className="text-xl font-semibold text-foreground">Departments</h1>
        <Button onClick={() => openFormDialog({ mode: "create" })}>
          <Plus className="h-4 w-4" />
          Add department
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
        <Input
          type="search"
          placeholder="Search by code or name"
          className="pl-9"
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
          aria-label="Search departments"
        />
      </div>

      {isError && (
        <Alert
          variant="inline"
          status="error"
          timeout={0}
          title="Couldn't load departments"
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
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Loading departments...
                </TableCell>
              </TableRow>
            ) : pageRows.length ? (
              pageRows.map((department) => (
                <TableRow key={department.id}>
                  <TableCell className="font-medium">{department.code}</TableCell>
                  <TableCell>{department.name}</TableCell>
                  <TableCell>
                    <Badge variant={department.isActive ? "default" : "outline"}>
                      {department.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Actions for ${department.name}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => openFormDialog({ mode: "edit", department })}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            to={`/super-admin/department-admin-grants?departmentId=${department.id}`}
                          >
                            Manage admins
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/super-admin/module-grants?departmentId=${department.id}`}>
                            Manage module-creation grants
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setDeactivateTarget(department)}>
                          {department.isActive ? "Deactivate" : "Reactivate"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  {search ? "No departments match your search." : "No departments yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {filteredDepartments.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            <span className="text-foreground">
              {(safePage - 1) * PAGE_SIZE + 1}-
              {Math.min(safePage * PAGE_SIZE, filteredDepartments.length)}
            </span>{" "}
            of <span className="text-foreground">{filteredDepartments.length}</span>
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

      <DepartmentFormDialog
        key={formDialogNonce}
        open={formDialog !== null}
        onOpenChange={(open) => !open && setFormDialog(null)}
        mode={formDialog?.mode ?? "create"}
        department={formDialog?.mode === "edit" ? formDialog.department : undefined}
        onSuccess={(mode, savedDepartment, apiMessage) =>
          showToast(
            apiMessage,
            mode === "create"
              ? `${savedDepartment.name} can now be assigned modules and a Department Admin.`
              : `${savedDepartment.name}'s details have been saved.`,
          )
        }
      />

      <DeactivateDepartmentDialog
        department={deactivateTarget}
        open={deactivateTarget !== null}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        onSuccess={(action, targetDepartment, apiMessage) =>
          showToast(
            apiMessage,
            action === "deactivated"
              ? `${targetDepartment.name} is now marked inactive.`
              : `${targetDepartment.name} is active again.`,
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
