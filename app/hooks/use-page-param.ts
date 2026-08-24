import { useCallback } from "react";
import { useSearchParams } from "react-router";

// In the URL, so a page survives opening a record. Page 1 is the absence of the param.
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
        // Replace, or paging buries the screen you arrived from under a dozen history entries.
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return [page, setPage];
}
