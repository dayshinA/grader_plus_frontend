import type { ReactNode } from "react";

import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Right-aligns numbers and counts, where digits should line up. */
  align?: "start" | "end";
  /** Applied to the header cell and the body cells, for example `hidden lg:table-cell`. */
  className?: string;
  skeletonClassName?: string;
}

// A table from `md:` up, cards below, because five columns at 375px is a sideways scroll.
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  renderCard,
  isLoading = false,
  skeletonRows = 5,
  empty,
  caption,
  className,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string | number;
  /** Row rendering for narrow screens. Without it the table itself scrolls horizontally. */
  renderCard?: (row: T) => ReactNode;
  isLoading?: boolean;
  skeletonRows?: number;
  empty?: ReactNode;
  caption?: string;
  className?: string;
}) {
  const showEmpty = !isLoading && rows.length === 0;

  if (showEmpty && empty) {
    return <>{empty}</>;
  }

  const skeletonKeys = Array.from({ length: skeletonRows }, (_, index) => index);

  return (
    <div className={className}>
      {/* Cards on mobile. Hidden entirely when the caller didn't supply one, leaving the table
          (which scrolls) as the single rendering at every width. */}
      {renderCard && (
        <div className="space-y-3 md:hidden">
          {isLoading
            ? skeletonKeys.map((key) => (
                <div key={key} className="rounded-xl border border-border p-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-2 h-3 w-44 max-w-full" />
                  <Skeleton className="mt-4 h-4 w-24" />
                </div>
              ))
            : rows.map((row) => <div key={getRowId(row)}>{renderCard(row)}</div>)}
        </div>
      )}

      <div className={cn("rounded-xl border border-border", renderCard && "hidden md:block")}>
        <Table>
          {caption && <TableCaption className="sr-only">{caption}</TableCaption>}
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(
                    "px-4 text-xs font-medium text-muted-foreground",
                    column.align === "end" && "text-right",
                    column.className,
                  )}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? skeletonKeys.map((key) => (
                  <TableRow key={key} className="hover:bg-transparent">
                    {columns.map((column) => (
                      <TableCell key={column.id} className={cn("px-4 py-3", column.className)}>
                        <Skeleton
                          className={cn(
                            "h-4 w-24",
                            column.align === "end" && "ml-auto",
                            column.skeletonClassName,
                          )}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows.map((row) => (
                  <TableRow key={getRowId(row)}>
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        className={cn(
                          "px-4 py-3",
                          column.align === "end" && "text-right",
                          column.className,
                        )}
                      >
                        {column.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
