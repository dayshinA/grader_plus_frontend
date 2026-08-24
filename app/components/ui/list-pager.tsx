import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "~/components/ui/pagination";
import { cn } from "~/lib/utils";

// First, last and the current page's neighbours, so the control is a fixed width at any size.
function pageRange(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages: (number | "ellipsis")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) pages.push("ellipsis");
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < total - 1) pages.push("ellipsis");

  pages.push(total);
  return pages;
}

// Renders nothing for a single page, and collapses to a label below `sm:`.
export function ListPager({
  page,
  pageCount,
  onPageChange,
  className,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (pageCount <= 1) return null;

  const go = (next: number) => onPageChange(Math.min(pageCount, Math.max(1, next)));

  return (
    <Pagination className={cn("mx-0 w-auto justify-between sm:justify-center", className)}>
      <PaginationContent className="w-full justify-between sm:w-auto sm:justify-center">
        <PaginationItem>
          <PaginationPrevious
            href="#"
            aria-disabled={page === 1}
            className={cn("cursor-pointer", page === 1 && "pointer-events-none opacity-50")}
            onClick={(event) => {
              event.preventDefault();
              go(page - 1);
            }}
          />
        </PaginationItem>

        <span className="text-sm text-muted-foreground sm:hidden" aria-live="polite">
          Page {page} of {pageCount}
        </span>

        {pageRange(page, pageCount).map((entry, index) =>
          entry === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${index}`} className="hidden sm:block">
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={entry} className="hidden sm:block">
              <PaginationLink
                href="#"
                isActive={entry === page}
                aria-label={`Page ${entry}`}
                className="cursor-pointer"
                onClick={(event) => {
                  event.preventDefault();
                  go(entry);
                }}
              >
                {entry}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            href="#"
            aria-disabled={page === pageCount}
            className={cn("cursor-pointer", page === pageCount && "pointer-events-none opacity-50")}
            onClick={(event) => {
              event.preventDefault();
              go(page + 1);
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
