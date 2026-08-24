import { useEffect, useMemo } from "react";

import { usePageParam } from "~/hooks/use-page-param";

export interface PagedList<T> {
  rows: T[];
  page: number;
  pageCount: number;
  setPage: (page: number) => void;
  /** Rows across every page, after filtering, for the "12 of 40" summary line. */
  total: number;
}

// The API is unpaged, so paging is ours. Pass filtered rows: it resets to page 1 when they shrink.
export function usePagedList<T>(rows: T[], pageSize = 10): PagedList<T> {
  const [page, setPage] = usePageParam();

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount);

  // Or searching on page 3 of a now single page list leaves the screen rendering nothing.
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount, setPage]);

  const pageRows = useMemo(
    () => rows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [rows, safePage, pageSize],
  );

  return { rows: pageRows, page: safePage, pageCount, setPage, total: rows.length };
}
