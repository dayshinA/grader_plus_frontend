import { useEffect, useMemo } from "react";

import { usePageParam } from "~/hooks/use-page-param";

export interface PagedList<T> {
  /** The rows for the current page. */
  rows: T[];
  page: number;
  pageCount: number;
  setPage: (page: number) => void;
  /** Rows across every page, after filtering — for the "12 of 40" summary line. */
  total: number;
}

/**
 * Client-side paging for a list screen.
 *
 * The API returns every row in one response — it has no pagination anywhere — so paging is
 * entirely ours. The page number still lives in the URL (see `usePageParam`) so it survives
 * opening a record and coming back.
 *
 * Filtering happens before this: pass the already-filtered rows, and the hook resets to page 1
 * whenever the filter shrinks the list past the page the screen is sitting on.
 */
export function usePagedList<T>(rows: T[], pageSize = 10): PagedList<T> {
  const [page, setPage] = usePageParam();

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount);

  // Typing into search on page 3 of a list that now has one page would otherwise leave the screen
  // on a page that no longer exists, rendering empty.
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount, setPage]);

  const pageRows = useMemo(
    () => rows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [rows, safePage, pageSize],
  );

  return { rows: pageRows, page: safePage, pageCount, setPage, total: rows.length };
}
