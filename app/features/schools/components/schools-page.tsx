import { Landmark, MoreHorizontal, Plus, Search } from "lucide-react";
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
import { useSchools } from "~/features/schools/api/use-schools";
import { DeactivateSchoolDialog } from "~/features/schools/components/deactivate-school-dialog";
import { SchoolFormDialog } from "~/features/schools/components/school-form-dialog";
import type { SchoolResponse } from "~/features/schools/types";
import { ApiError } from "~/lib/api-client";

const PAGE_SIZE = 10;
const PAGINATION_ITEMS_TO_DISPLAY = 5;

type FormDialogState = { mode: "create" } | { mode: "edit"; school: SchoolResponse } | null;

/** Super Admin CRUD screen for `schools` — direct structural mirror of `DepartmentsPage`, one
 * level up the hierarchy (see SYSTEM_DESIGN.md decision #37). */
export function SchoolsPage() {
  const { data: schools, isLoading, isError, error } = useSchools();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [formDialog, setFormDialog] = useState<FormDialogState>(null);
  // Bumped every time the form dialog opens, and used as SchoolFormDialog's `key` below —
  // forces a fresh mount (fresh form/mutation state) on every open instead of an effect-based reset.
  const [formDialogNonce, setFormDialogNonce] = useState(0);
  const [deactivateTarget, setDeactivateTarget] = useState<SchoolResponse | null>(null);
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

  const filteredSchools = useMemo(() => {
    if (!schools) return [];
    const query = search.trim().toLowerCase();
    if (!query) return schools;
    return schools.filter(
      (school) =>
        school.name.toLowerCase().includes(query) || school.code.toLowerCase().includes(query),
    );
  }, [schools, search]);

  const totalPages = Math.max(1, Math.ceil(filteredSchools.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage: safePage,
    totalPages,
    paginationItemsToDisplay: PAGINATION_ITEMS_TO_DISPLAY,
  });
  const pageRows = filteredSchools.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSearchChange(value: string) {
    setSearch(value);
    setCurrentPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Schools"
        icon={Landmark}
        actions={
          <Button onClick={() => openFormDialog({ mode: "create" })}>
            <Plus className="h-4 w-4" />
            Add school
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
            aria-label="Search schools"
          />
        </div>
      </PageHeader>

      {isError && (
        <Alert
          variant="inline"
          status="error"
          timeout={0}
          title="Couldn't load schools"
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
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Loading schools...
                </TableCell>
              </TableRow>
            ) : pageRows.length ? (
              pageRows.map((school) => (
                <TableRow key={school.id}>
                  <TableCell className="font-medium">{school.code}</TableCell>
                  <TableCell>{school.name}</TableCell>
                  <TableCell>
                    <Badge variant={school.isActive ? "default" : "outline"}>
                      {school.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Actions for ${school.name}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => openFormDialog({ mode: "edit", school })}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/super-admin/school-admin-grants?schoolId=${school.id}`}>
                            Manage admins
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/super-admin/departments?schoolId=${school.id}`}>
                            View departments
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setDeactivateTarget(school)}>
                          {school.isActive ? "Deactivate" : "Reactivate"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  {search ? "No schools match your search." : "No schools yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {filteredSchools.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            <span className="text-foreground">
              {(safePage - 1) * PAGE_SIZE + 1}-
              {Math.min(safePage * PAGE_SIZE, filteredSchools.length)}
            </span>{" "}
            of <span className="text-foreground">{filteredSchools.length}</span>
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

      <SchoolFormDialog
        key={formDialogNonce}
        open={formDialog !== null}
        onOpenChange={(open) => !open && setFormDialog(null)}
        mode={formDialog?.mode ?? "create"}
        school={formDialog?.mode === "edit" ? formDialog.school : undefined}
        onSuccess={(mode, savedSchool, apiMessage) =>
          showToast(
            apiMessage,
            mode === "create"
              ? `${savedSchool.name} can now be assigned departments and a School Admin.`
              : `${savedSchool.name}'s details have been saved.`,
          )
        }
      />

      <DeactivateSchoolDialog
        school={deactivateTarget}
        open={deactivateTarget !== null}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        onSuccess={(action, targetSchool, apiMessage) =>
          showToast(
            apiMessage,
            action === "deactivated"
              ? `${targetSchool.name} is now marked inactive.`
              : `${targetSchool.name} is active again.`,
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
