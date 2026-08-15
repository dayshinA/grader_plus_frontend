import { useMemo, useState } from "react";
import { ScrollText } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { DataTable, type DataTableColumn } from "~/components/ui/data-table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { ErrorCard } from "~/components/ui/error-card";
import { JsonViewer } from "~/components/ui/json-viewer";
import { ListPager } from "~/components/ui/list-pager";
import { ListToolbar } from "~/components/ui/list-toolbar";
import type { AuditLogEntry } from "~/features/audit/types";
import { usePagedList } from "~/hooks/use-paged-list";
import { formatDateTime, humanise, pluralise } from "~/utils/format";

/** Before and after, only when there is something to show. */
function ChangeDetail({ entry }: { entry: AuditLogEntry }) {
  if (!entry.before && !entry.after) {
    return <span className="text-xs text-muted-foreground">No payload recorded</span>;
  }

  return (
    <Collapsible>
      <CollapsibleTrigger className="cursor-pointer text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        What changed
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pt-2">
        {entry.before && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Before</p>
            <JsonViewer value={entry.before} label="Before" />
          </div>
        )}
        {entry.after && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">After</p>
            <JsonViewer value={entry.after} label="After" />
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * The shared audit list. Read only in the strongest sense: the table has no update route
 * and no delete route behind it, so there is no row menu here that would imply one.
 */
export function AuditTable({
  entries,
  isLoading,
  isError,
  error,
  onRetry,
  isRetrying,
  emptyDescription,
}: {
  entries: AuditLogEntry[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  onRetry?: () => void;
  isRetrying?: boolean;
  emptyDescription: string;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = entries ?? [];
    if (!term) return rows;
    return rows.filter((entry) =>
      `${entry.action} ${entry.entityType} ${entry.entityId ?? ""}`.toLowerCase().includes(term),
    );
  }, [entries, search]);

  const paged = usePagedList(filtered, 25);

  if (isError) {
    return (
      <ErrorCard
        title="Could not load the audit log"
        error={error}
        onRetry={onRetry}
        isRetrying={isRetrying}
      />
    );
  }

  const columns: DataTableColumn<AuditLogEntry>[] = [
    {
      id: "when",
      header: "When",
      cell: (entry) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {formatDateTime(entry.createdAt)}
        </span>
      ),
      skeletonClassName: "w-32",
    },
    {
      id: "action",
      header: "Action",
      cell: (entry) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-xs">{entry.action}</p>
          <p className="truncate text-xs text-muted-foreground">{humanise(entry.entityType)}</p>
        </div>
      ),
      skeletonClassName: "w-40",
    },
    {
      id: "actor",
      header: "Actor",
      cell: (entry) => (
        <span className="font-mono text-xs text-muted-foreground">
          {entry.actorUserId ? entry.actorUserId.slice(0, 8) : "system"}
        </span>
      ),
      className: "hidden lg:table-cell",
      skeletonClassName: "w-20",
    },
    {
      id: "ip",
      header: "From",
      cell: (entry) => (
        <span className="font-mono text-xs text-muted-foreground">{entry.ipAddress ?? "—"}</span>
      ),
      className: "hidden xl:table-cell",
      skeletonClassName: "w-24",
    },
    {
      id: "detail",
      header: "Detail",
      cell: (entry) => <ChangeDetail entry={entry} />,
      skeletonClassName: "w-20",
    },
  ];

  const renderCard = (entry: AuditLogEntry) => (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs">{entry.action}</p>
          <p className="truncate text-xs text-muted-foreground">
            {formatDateTime(entry.createdAt)}
          </p>
        </div>
        <Badge variant="outline">{humanise(entry.entityType)}</Badge>
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <ChangeDetail entry={entry} />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchLabel="Search the audit log by action or entity"
        placeholder="Search entries"
      />

      <DataTable
        columns={columns}
        rows={paged.rows}
        getRowId={(entry) => entry.id}
        renderCard={renderCard}
        isLoading={isLoading}
        caption="Recorded actions, newest first"
        empty={
          <Card>
            <CardContent className="py-4">
              <Empty className="px-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ScrollText aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>
                    {search ? "No entries match that search" : "Nothing recorded yet"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {search ? "Try a shorter term, or clear the search." : emptyDescription}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </CardContent>
          </Card>
        }
      />

      {!isLoading && paged.total > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {pluralise(paged.total, "entry", "entries")}
            {paged.pageCount > 1 && ` · page ${paged.page} of ${paged.pageCount}`}
          </p>
          <ListPager page={paged.page} pageCount={paged.pageCount} onPageChange={paged.setPage} />
        </div>
      )}
    </div>
  );
}
