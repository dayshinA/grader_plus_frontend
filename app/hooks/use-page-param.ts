import { useCallback } from "react";
import { useSearchParams } from "react-router";

/**
 * A list screen's page number, held in the URL rather than in component state.
 *
 * It lives there for the same reason the filters do: so the page an admin is on survives opening a
 * record and coming back (see `backTo`, which carries the whole query string as the back
 * target), and so "the row I meant is on page 3" is something you can send to a colleague.
 *
 * Page 1 is the absence of the param rather than `?page=1`: the first page and no page are the
 * same list, and two URLs for one view is a URL nobody can compare.
 */
export function usePageParam(): [number, (page: number) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get("page");
  const page = raw && /^\d+$/.test(raw) ? Math.max(1, Number(raw)) : 1;

  const setPage = useCallback(
    (next: number) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          if (next <= 1) params.delete("page");
          else params.set("page", String(next));
          return params;
        },
        // Replace, so paging through a list doesn't bury the screen you arrived from under a dozen
        // history entries that the browser's own back button then has to walk out of.
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return [page, setPage];
}
