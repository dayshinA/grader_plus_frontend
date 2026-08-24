import type { ReactNode } from "react"
import { ArrowDown, ArrowUp } from "lucide-react"

import { Badge } from "~/components/ui/badge"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Skeleton } from "~/components/ui/skeleton"

export interface StatCardData {
  title: string
  /** Omitted while the number is not known yet, so the card renders its loading state. */
  value?: number
  /** Period-over-period change, in percent. Omit when there is nothing to compare against. */
  delta?: number
  lastMonth?: number
  format?: (value: number) => string
  /** Replaces the "Vs last month" footer, for example "Across every offering". */
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
  // Skeletons at the real content's size, so the number arriving does not move the page.
  loading?: boolean
  // Shows a dash rather than skeletons, because loading forever reads as "still working".
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
