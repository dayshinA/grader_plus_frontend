import type { ReactNode } from "react"
import { ArrowDown, ArrowUp } from "lucide-react"

import { Badge } from "~/components/ui/badge"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Skeleton } from "~/components/ui/skeleton"

export interface StatCardData {
  title: string
  /** Omitted while the number isn't known yet — the card renders its loading state instead. */
  value?: number
  /** Period-over-period change, in percent. Omit when there's nothing to compare against. */
  delta?: number
  lastMonth?: number
  format?: (value: number) => string
  /** Replaces the "Vs last month" footer — e.g. "Across all client wallets". */
  caption?: ReactNode
}

function formatNumber(value: number) {
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + "M"
  if (value >= 1_000) return value.toLocaleString()
  return value.toString()
}

export function StatCard({
  stat,
  actions,
  loading = false,
  unavailable = false,
}: {
  stat: StatCardData
  actions?: ReactNode
  /**
   * Renders the value, delta and footer as skeletons at the size the real content will take, so
   * the number arriving doesn't move anything on the page.
   */
  loading?: boolean
  /**
   * The number couldn't be fetched. Shows an em dash instead of skeletons, because a tile that
   * loads forever reads as "still working" — an admin should be able to tell at a glance that this
   * figure is missing rather than late. Pair it with a caption saying so.
   */
  unavailable?: boolean
}) {
  const format = stat.format ?? formatNumber
  const isLoading = !unavailable && (loading || stat.value === undefined)
  const positive = (stat.delta ?? 0) >= 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
        {actions && <CardAction>{actions}</CardAction>}
      </CardHeader>
      <CardContent className="space-y-2.5">
        <div className="flex items-center gap-2.5">
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : unavailable || stat.value === undefined ? (
            <span className="text-2xl font-medium tracking-tight text-muted-foreground">—</span>
          ) : (
            <span className="text-2xl font-medium tracking-tight text-foreground">
              {format(stat.value)}
            </span>
          )}
          {!isLoading && !unavailable && stat.delta !== undefined && (
            <Badge variant={positive ? "success" : "destructive"}>
              {positive ? <ArrowUp /> : <ArrowDown />}
              {Math.abs(stat.delta)}%
            </Badge>
          )}
        </div>
        {(stat.caption || isLoading || stat.lastMonth !== undefined) && (
          <div className="border-t border-border pt-2.5 text-xs text-muted-foreground">
            {stat.caption ??
              (isLoading || stat.lastMonth === undefined ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                <>
                  Vs last month:{" "}
                  <span className="font-medium text-foreground">{format(stat.lastMonth)}</span>
                </>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
