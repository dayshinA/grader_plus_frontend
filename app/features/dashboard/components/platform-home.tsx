import { Link } from "react-router";
import {
  ArrowRight,
  Building2,
  FolderOpen,
  GraduationCap,
  Layers,
  Scale,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { ErrorCard } from "~/components/ui/error-card";
import { Skeleton } from "~/components/ui/skeleton";
import { AUDIT_HIDDEN } from "~/features/audit/visibility";
import { useAdminOverview } from "~/features/dashboard/api/use-dashboard";
import { useModulesForUnits, useUnits } from "~/features/structure/api/use-structure";
import { useUsers } from "~/features/users/api/use-users";
import { backTo } from "~/hooks/use-back-link";
import { formatNumber, pluralise } from "~/utils/format";
import { cn } from "~/lib/utils";

const RECENT_ACCOUNTS = 4;
const RECENT_MODULES = 5;
const SCHOOLS_SHOWN = 6;

function HeadlineTile({
  icon: Icon,
  label,
  value,
  caption,
  tone,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  caption?: string;
  tone?: "warn";
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums",
          tone === "warn" && value > 0 && "text-amber-600 dark:text-amber-400",
        )}
      >
        {formatNumber(value)}
      </p>
      {caption && <p className="mt-0.5 text-xs text-muted-foreground">{caption}</p>}
    </div>
  );
}

function Meter({ done, total, label }: { done: number; total: number; label: string }) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">
          {formatNumber(done)} / {formatNumber(total)} ({percent}%)
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${label}: ${done} of ${total}`}
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-11 rounded-lg" />
      ))}
    </div>
  );
}

function CardLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Button asChild variant="outline" className="mt-auto h-11 w-full cursor-pointer sm:h-9">
      <Link to={to} state={backTo({ to: "/", label: "home" })}>
        {children}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </Button>
  );
}

/**
 * The platform surface, rendered as a section of home for a system administrator. It
 * replaced the separate /admin/overview screen, which now redirects here.
 *
 * Counts come from GET /admin/overview; the rows under them are the newest accounts, the
 * schools and the newest modules, fetched from the list routes the admin screens already
 * use, on the same query keys. Not academic data: no mark appears anywhere in this
 * component, and no query behind it fetches one.
 */
export function PlatformHome() {
  const overview = useAdminOverview();
  const users = useUsers();
  const units = useUnits();

  const unitIds = (units.data ?? []).map((unit) => unit.id);
  const modules = useModulesForUnits(unitIds);

  if (overview.isError) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Platform</h2>
        <ErrorCard
          title="Could not load the platform overview"
          error={overview.error}
          onRetry={() => void overview.refetch()}
          isRetrying={overview.isFetching}
        />
      </section>
    );
  }

  const data = overview.data;
  const unitName = new Map((units.data ?? []).map((unit) => [unit.id, unit.name]));
  const schools = (units.data ?? [])
    .filter((unit) => unit.level === "school")
    .sort((a, b) => a.name.localeCompare(b.name));
  const childCount = (schoolId: string) =>
    (units.data ?? []).filter((unit) => unit.parentUnitId === schoolId).length;

  const recentAccounts = [...(users.data ?? [])]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, RECENT_ACCOUNTS);

  const recentModules = [...modules.modules]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, RECENT_MODULES);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Platform</h2>
        <Badge variant="secondary">System</Badge>
      </div>

      {!data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-6 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton
              key={index}
              className={cn(
                "h-24 rounded-xl sm:col-span-2 xl:col-span-1",
                index >= 3 && "sm:col-span-3",
                index === 4 && "col-span-2",
              )}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-6 xl:grid-cols-5">
          <HeadlineTile
            icon={UserRound}
            label="Active accounts"
            value={data.accounts.active}
            caption={`of ${formatNumber(data.accounts.total)} total`}
            className="sm:col-span-2 xl:col-span-1"
          />
          <HeadlineTile
            icon={GraduationCap}
            label="Schools"
            value={data.structure.schools}
            caption={pluralise(data.structure.constituentUnits, "constituent unit")}
            className="sm:col-span-2 xl:col-span-1"
          />
          <HeadlineTile
            icon={FolderOpen}
            label="Open offerings"
            value={data.work.openOfferings}
            caption={`of ${formatNumber(data.work.offerings)} total`}
            className="sm:col-span-2 xl:col-span-1"
          />
          <HeadlineTile
            icon={Layers}
            label="Projects"
            value={data.work.projects}
            caption={`${formatNumber(data.work.gradedProjects)} graded`}
            className="sm:col-span-3 xl:col-span-1"
          />
          <HeadlineTile
            icon={Scale}
            label="Open cases"
            value={data.work.openDiscrepancies}
            caption={
              data.work.openDiscrepancies === 0 ? "Nothing contested" : "Waiting on coordinators"
            }
            tone="warn"
            className="col-span-2 sm:col-span-3 xl:col-span-1"
          />
        </div>
      )}

      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Accounts</CardTitle>
            <CardDescription>
              {data
                ? `${pluralise(data.accounts.activeRoleGrants, "live role grant")} across the platform.`
                : "Staff only. Students never hold an account."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            {data && (
              <Meter done={data.accounts.active} total={data.accounts.total} label="Active" />
            )}
            {users.isLoading ? (
              <ListSkeleton rows={RECENT_ACCOUNTS} />
            ) : users.isError ? (
              <p className="text-sm text-muted-foreground">Accounts could not be loaded.</p>
            ) : (
              <ul className="space-y-2">
                {recentAccounts.map((account) => (
                  <li key={account.id}>
                    <Link
                      to={`/admin/users/${account.id}`}
                      state={backTo({ to: "/", label: "home" })}
                      className="flex items-center gap-3 rounded-lg border border-border p-2.5 transition-colors hover:border-primary/40 hover:bg-accent/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{account.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">{account.email}</p>
                      </div>
                      {!account.isActive && <Badge variant="secondary">Deactivated</Badge>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <CardLink to="/admin/users">All accounts</CardLink>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Schools</CardTitle>
            <CardDescription>
              {data
                ? `${pluralise(data.structure.programmes, "programme")} and ${pluralise(data.structure.modules, "module")} beneath them.`
                : "Two levels of unit, then programmes and modules."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            {units.isLoading ? (
              <ListSkeleton rows={4} />
            ) : units.isError ? (
              <p className="text-sm text-muted-foreground">Units could not be loaded.</p>
            ) : (
              <>
                <ul className="space-y-2">
                  {schools.slice(0, SCHOOLS_SHOWN).map((school) => (
                    <li key={school.id}>
                      <Link
                        to={`/units/${school.id}`}
                        state={backTo({ to: "/", label: "home" })}
                        className="flex items-center gap-3 rounded-lg border border-border p-2.5 transition-colors hover:border-primary/40 hover:bg-accent/50"
                      >
                        <Building2
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <p className="min-w-0 flex-1 truncate text-sm font-medium">
                          {school.name}
                        </p>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {pluralise(childCount(school.id), "unit")}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {schools.length > SCHOOLS_SHOWN && (
                  <p className="text-xs text-muted-foreground">
                    And {schools.length - SCHOOLS_SHOWN} more.
                  </p>
                )}
              </>
            )}
            <CardLink to="/admin/units">All academic units</CardLink>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Newest modules</CardTitle>
            <CardDescription>Project modules, most recently created first.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            {units.isLoading || modules.isLoading ? (
              <ListSkeleton rows={RECENT_MODULES} />
            ) : recentModules.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No modules yet. They are created on a unit, under academic units.
              </p>
            ) : (
              <ul className="space-y-2">
                {recentModules.map((module) => (
                  <li key={module.id}>
                    <Link
                      to={`/admin/modules?unit=${module.administrativeUnitId}`}
                      state={backTo({ to: "/", label: "home" })}
                      className="flex items-center gap-3 rounded-lg border border-border p-2.5 transition-colors hover:border-primary/40 hover:bg-accent/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {module.code}{" "}
                          <span className="font-normal text-muted-foreground">{module.title}</span>
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {unitName.get(module.administrativeUnitId) ?? "Unknown unit"}
                        </p>
                      </div>
                      {!module.isActive && <Badge variant="secondary">Inactive</Badge>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <CardLink to="/admin/modules">All modules</CardLink>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              Marking
              {data && data.work.openDiscrepancies > 0 && (
                <Badge variant="warning">
                  {pluralise(data.work.openDiscrepancies, "open case")}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Offerings, projects and anything unsettled.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            {data ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-semibold tabular-nums">
                      {formatNumber(data.work.openOfferings)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Open offerings</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold tabular-nums">
                      {formatNumber(data.work.offerings - data.work.openOfferings)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Closed offerings</p>
                  </div>
                </div>
                <Meter
                  done={data.work.gradedProjects}
                  total={data.work.projects}
                  label="Projects graded"
                />
              </>
            ) : (
              <ListSkeleton rows={2} />
            )}
            {!AUDIT_HIDDEN && <CardLink to="/admin/audit">Audit log</CardLink>}
          </CardContent>
        </Card>
      </div>

      {data && data.work.openDiscrepancies > 0 && (
        <Callout variant="warning" title="Open discrepancy cases">
          {data.work.openDiscrepancies} case
          {data.work.openDiscrepancies === 1 ? " is" : "s are"} waiting on a coordinator.
          Only the offering's own coordinator can settle a case, so use this count to chase
          them up rather than act from here.
        </Callout>
      )}
    </section>
  );
}
