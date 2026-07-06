import * as React from "react";

import { Button } from "~/components/ui/button";
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

// Illustrative example data for this preview only — Table/Pagination take no
// GraderPlus-specific content. Standing in for a generic list screen (e.g. a
// coordinator's project list) until a real feature wires these in.
type Submission = {
  id: string;
  student: string;
  module: string;
  status: "Submitted" | "Marking" | "Finalised";
};

const MOCK_SUBMISSIONS: Submission[] = Array.from({ length: 95 }, (_, i) => ({
  id: `SUB-${1000 + i}`,
  student: `Student ${i + 1}`,
  module: ["COP101", "COP202", "COP303"][i % 3],
  status: (["Submitted", "Marking", "Finalised"] as const)[i % 3],
}));

const PAGE_SIZE = 10;
const PAGINATION_ITEMS_TO_DISPLAY = 5;

function PaginatedSubmissionsTable({ data }: { data: Submission[] }) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));

  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage,
    totalPages,
    paginationItemsToDisplay: PAGINATION_ITEMS_TO_DISPLAY,
  });

  const pageRows = data.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Submission</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length ? (
              pageRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.id}</TableCell>
                  <TableCell>{row.student}</TableCell>
                  <TableCell>{row.module}</TableCell>
                  <TableCell>{row.status}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {data.length === 0 ? (
            "0 results"
          ) : (
            <>
              <span className="text-foreground">
                {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, data.length)}
              </span>{" "}
              of <span className="text-foreground">{data.length}</span>
            </>
          )}
        </p>

        <Pagination className="mx-0 w-fit">
          <PaginationContent>
            <PaginationItem>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
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
                <PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page}>
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
                disabled={currentPage === totalPages}
                aria-label="Go to next page"
              >
                →
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}

export default function TablePreview() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 p-6 sm:p-10">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Table / Pagination — manual QA preview
      </h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          95 rows, page size 10 (many pages — ellipsis both sides once past page 3)
        </h2>
        <PaginatedSubmissionsTable data={MOCK_SUBMISSIONS} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          8 rows, page size 10 (single page — no pagination controls needed, still renders cleanly)
        </h2>
        <PaginatedSubmissionsTable data={MOCK_SUBMISSIONS.slice(0, 8)} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Empty state</h2>
        <PaginatedSubmissionsTable data={[]} />
      </section>
    </div>
  );
}
