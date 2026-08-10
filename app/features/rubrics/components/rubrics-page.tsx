import { ScrollText } from "lucide-react";
import { useMemo } from "react";

import { Card, CardContent } from "~/components/ui/card";
import { Callout } from "~/components/ui/callout";
import { DataTable, type DataTableColumn } from "~/components/ui/data-table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { ErrorCard } from "~/components/ui/error-card";
import { PageHeader } from "~/components/ui/page-header";
import { useModuleSelection } from "~/features/academic-modules/api/use-module-selection";
import {
  ModulePicker,
  NoModulesCard,
} from "~/features/academic-modules/components/module-picker";
import { findNavItem } from "~/features/dashboard/nav";
import { isRubricMissing, useRubric } from "~/features/rubrics/api/use-rubric";
import type { RubricCriterionResponse } from "~/features/rubrics/types";
import { is403 } from "~/lib/api-client";

const nav = findNavItem("/workspace/rubrics");

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Two decimals, but only when they carry information — 25 rather than 25.00. */
function formatWeighting(value: number): string {
  return `${Number(value.toFixed(2))}%`;
}

/**
 * A module's rubric, read-only.
 *
 * Authoring is the module Coordinator's alone (`rubrics.create`/`update`/`delete`); Department
 * Admin and System Administrator hold `rubrics.view` for oversight one hop above the module, and
 * School Admin deliberately holds nothing here at all. So this screen has no write controls yet —
 * when the Coordinator's authoring flow is built it belongs on this same screen, gated per
 * control, not on a second one.
 */
export function RubricsPage() {
  const { modules, moduleId, selectedModule, noModules, isLoading, onModuleChange } =
    useModuleSelection();
  const {
    data: rubric,
    isLoading: rubricLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useRubric(moduleId ?? undefined);

  // Both mean "there is nothing to show for this module" rather than "something went wrong":
  // a 404 is a module whose rubric hasn't been built yet, and a 403 is the RBAC model's way of
  // saying the same thing about a module this account can't reach (decision #44).
  const noRubric = isError && (isRubricMissing(error) || is403(error));
  const criteria = useMemo(() => rubric?.criteria ?? [], [rubric]);

  const weightingTotal = useMemo(
    () => criteria.reduce((sum, criterion) => sum + criterion.weighting, 0),
    [criteria],
  );
  // Compared at 2dp, matching the backend's `numeric(5,2)` column, so a rubric that really does
  // sum to 100 never trips the warning on float noise.
  const weightingsValid = Number(weightingTotal.toFixed(2)) === 100;

  const columns: DataTableColumn<RubricCriterionResponse>[] = [
    {
      id: "criterion",
      header: "Criterion",
      cell: (criterion) => (
        <div className="min-w-0">
          <p className="font-medium text-foreground">{criterion.label}</p>
          <p className="text-xs text-muted-foreground">{criterion.description}</p>
        </div>
      ),
      skeletonClassName: "w-56",
    },
    {
      id: "weighting",
      header: "Weighting",
      align: "end",
      cell: (criterion) => (
        <span className="tabular-nums text-foreground">
          {formatWeighting(criterion.weighting)}
        </span>
      ),
      skeletonClassName: "w-12",
    },
    {
      id: "maxScore",
      header: "Max score",
      align: "end",
      cell: (criterion) => (
        <span className="tabular-nums text-muted-foreground">{criterion.maxScore}</span>
      ),
      className: "hidden sm:table-cell",
      skeletonClassName: "w-10",
    },
  ];

  const renderCard = (criterion: RubricCriterionResponse) => (
    <div className="rounded-xl border border-border p-4">
      <p className="font-medium text-foreground">{criterion.label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{criterion.description}</p>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3 text-sm">
        <span className="tabular-nums text-foreground">
          {formatWeighting(criterion.weighting)} of the final mark
        </span>
        <span className="tabular-nums text-muted-foreground">Max {criterion.maxScore}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rubrics"
        description={nav?.description}
        actions={
          <ModulePicker
            modules={modules}
            moduleId={moduleId}
            onModuleChange={onModuleChange}
          />
        }
      />

      {noModules ? (
        <NoModulesCard description="Rubrics belong to a module. You don't coordinate or administer any yet." />
      ) : isError && !noRubric ? (
        <ErrorCard
          title="Couldn't load the rubric"
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      ) : noRubric ? (
        <Card>
          <CardContent className="py-4">
            <Empty className="px-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ScrollText aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No rubric yet</EmptyTitle>
                <EmptyDescription>
                  {selectedModule?.code ?? "This module"} doesn&apos;t have a rubric. Its
                  coordinator builds one before any marking can start.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rubric && (
            <Card>
              <CardContent className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-medium text-foreground">
                    {rubric.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {criteria.length} {criteria.length === 1 ? "criterion" : "criteria"} ·{" "}
                    {selectedModule ? `${selectedModule.code} · ` : ""}created{" "}
                    {formatDate(rubric.createdAt)}
                  </p>
                </div>
                <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
                  {formatWeighting(weightingTotal)} allocated
                </p>
              </CardContent>
            </Card>
          )}

          {/* The backend never checks this at save time — only when the first marker tries to
              start an evaluation, which fails with 422 RUBRIC_WEIGHTINGS_INVALID. Surfacing it
              here is the only warning anyone gets before a marker hits that wall. */}
          {rubric && !rubricLoading && criteria.length > 0 && !weightingsValid && (
            <Callout variant="warning" title="Weightings don't add up to 100%">
              They currently total {formatWeighting(weightingTotal)}. Markers can&apos;t start an
              evaluation against this rubric until the module&apos;s coordinator fixes it.
            </Callout>
          )}

          <DataTable
            columns={columns}
            rows={criteria}
            getRowId={(criterion) => criterion.id}
            renderCard={renderCard}
            isLoading={isLoading || rubricLoading}
            caption="Rubric criteria, in the order markers see them"
            empty={
              <Card>
                <CardContent className="py-4">
                  <Empty className="px-0">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <ScrollText aria-hidden="true" />
                      </EmptyMedia>
                      <EmptyTitle>No criteria yet</EmptyTitle>
                      <EmptyDescription>
                        The rubric exists but has nothing to score against. Its coordinator adds
                        criteria before marking opens.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </CardContent>
              </Card>
            }
          />
        </div>
      )}
    </div>
  );
}
