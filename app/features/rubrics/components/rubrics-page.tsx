import { Pencil, Plus, ScrollText, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Callout } from "~/components/ui/callout";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
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
import { useAuth } from "~/features/auth/api/auth-context";
import { findNavItem } from "~/features/dashboard/nav";
import { hasPermission } from "~/features/permissions/utils";
import {
  rubricDeleteBlockedMessage,
  useDeleteCriterion,
  useDeleteRubric,
} from "~/features/rubrics/api/use-rubric-mutations";
import { isRubricMissing, useRubric } from "~/features/rubrics/api/use-rubric";
import { CriterionFormDialog } from "~/features/rubrics/components/criterion-form-dialog";
import { RubricFormDialog } from "~/features/rubrics/components/rubric-form-dialog";
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

type RubricDialog =
  | { kind: "none" }
  | { kind: "create-rubric" }
  | { kind: "rename-rubric" }
  | { kind: "delete-rubric" }
  | { kind: "create-criterion" }
  | { kind: "edit-criterion"; criterion: RubricCriterionResponse }
  | { kind: "delete-criterion"; criterion: RubricCriterionResponse };

/**
 * A module's rubric — read for everyone who can see it, authoring for the module's own
 * Coordinator.
 *
 * `rubrics.view` (Coordinator, Department Admin, System Administrator; School Admin deliberately
 * holds nothing here) gets the read half. `rubrics.create`/`update`/`delete` belong to the
 * module's Coordinator alone since the backend's 2026-08-03 least-privilege redesign, and each
 * control below is gated on its own key — so a Department Admin sees exactly the screen they saw
 * before this session, with no disabled buttons hinting at capability they don't have.
 *
 * ⚠️ The gates are `permissionKeys` checks, which are **scope-blind** — a Coordinator of module A
 * sees the buttons on module B's rubric too. That's expected and handled: the server 403s, and the
 * failure surfaces as an error toast. The client check is UX, never the boundary.
 */
export function RubricsPage() {
  const { permissions } = useAuth();
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

  const [dialog, setDialog] = useState<RubricDialog>({ kind: "none" });
  // Bumped on every open so each dialog remounts with fresh state rather than resetting itself
  // in an effect — the convention `ModuleFormDialog` set.
  const [dialogKey, setDialogKey] = useState(0);

  const deleteRubric = useDeleteRubric(moduleId ?? "");
  const deleteCriterion = useDeleteCriterion(moduleId ?? "");

  const canCreate = hasPermission(permissions, "rubrics.create");
  const canUpdate = hasPermission(permissions, "rubrics.update");
  const canDelete = hasPermission(permissions, "rubrics.delete");
  const canAuthor = canCreate || canUpdate || canDelete;

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

  function openDialog(next: RubricDialog) {
    setDialogKey((value) => value + 1);
    setDialog(next);
  }

  function closeDialog() {
    setDialog({ kind: "none" });
  }

  /** Shared failure path for the two deletes — both have a 422 that deserves its own words. */
  function reportDeleteFailure(failure: unknown, fallback: string) {
    toast.error(
      rubricDeleteBlockedMessage(failure) ??
        (failure instanceof Error ? failure.message : fallback),
    );
  }

  function handleDeleteRubric() {
    deleteRubric.mutate(undefined, {
      onSuccess: ({ message }) => {
        closeDialog();
        toast.success(message);
      },
      onError: (failure) => reportDeleteFailure(failure, "Couldn't delete the rubric."),
    });
  }

  function handleDeleteCriterion(criterionId: string) {
    deleteCriterion.mutate(criterionId, {
      onSuccess: ({ message }) => {
        closeDialog();
        toast.success(message);
      },
      onError: (failure) => reportDeleteFailure(failure, "Couldn't delete the criterion."),
    });
  }

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

  if (canAuthor) {
    columns.push({
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "end",
      cell: (criterion) => (
        <div className="flex justify-end gap-1">
          {canUpdate && (
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer"
              aria-label={`Edit ${criterion.label}`}
              onClick={() => openDialog({ kind: "edit-criterion", criterion })}
            >
              <Pencil aria-hidden="true" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer text-destructive hover:text-destructive"
              aria-label={`Delete ${criterion.label}`}
              onClick={() => openDialog({ kind: "delete-criterion", criterion })}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          )}
        </div>
      ),
      skeletonClassName: "w-16",
    });
  }

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
      {canAuthor && (
        <div className="mt-3 flex gap-2 border-t border-border pt-3">
          {canUpdate && (
            <Button
              variant="outline"
              className="h-11 flex-1 cursor-pointer sm:h-9"
              onClick={() => openDialog({ kind: "edit-criterion", criterion })}
            >
              <Pencil aria-hidden="true" />
              Edit
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              className="h-11 flex-1 cursor-pointer text-destructive hover:text-destructive sm:h-9"
              onClick={() => openDialog({ kind: "delete-criterion", criterion })}
            >
              <Trash2 aria-hidden="true" />
              Delete
            </Button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rubrics"
        description={nav?.description}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <ModulePicker
              modules={modules}
              moduleId={moduleId}
              onModuleChange={onModuleChange}
            />
            {canCreate && rubric && !noRubric && (
              <Button
                className="h-11 cursor-pointer sm:h-9"
                onClick={() => openDialog({ kind: "create-criterion" })}
              >
                <Plus aria-hidden="true" />
                Add criterion
              </Button>
            )}
          </div>
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
                  {canCreate && !is403(error)
                    ? `${selectedModule?.code ?? "This module"} doesn't have a rubric. Build one before marking opens — markers can't start an evaluation without it.`
                    : `${selectedModule?.code ?? "This module"} doesn't have a rubric. Its coordinator builds one before any marking can start.`}
                </EmptyDescription>
              </EmptyHeader>
              {/* Not offered on a 403: that isn't "no rubric here yet", it's "not your module",
                  and a create button would only earn a second 403. */}
              {canCreate && !is403(error) && (
                <Button
                  className="h-11 cursor-pointer sm:h-9"
                  onClick={() => openDialog({ kind: "create-rubric" })}
                >
                  <Plus aria-hidden="true" />
                  Create rubric
                </Button>
              )}
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rubric && (
            <Card>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-baseline sm:justify-between">
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
                <div className="flex shrink-0 items-center gap-3">
                  <p className="text-sm tabular-nums text-muted-foreground">
                    {formatWeighting(weightingTotal)} allocated
                  </p>
                  {canUpdate && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 cursor-pointer sm:h-8"
                      onClick={() => openDialog({ kind: "rename-rubric" })}
                    >
                      <Pencil aria-hidden="true" />
                      Rename
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 cursor-pointer text-destructive hover:text-destructive sm:h-8"
                      onClick={() => openDialog({ kind: "delete-rubric" })}
                    >
                      <Trash2 aria-hidden="true" />
                      Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* The backend never checks this at save time — only when the first marker tries to
              start an evaluation, which fails with 422 RUBRIC_WEIGHTINGS_INVALID. Surfacing it
              here is the only warning anyone gets before a marker hits that wall. */}
          {rubric && !rubricLoading && criteria.length > 0 && !weightingsValid && (
            <Callout variant="warning" title="Weightings don't add up to 100%">
              They currently total {formatWeighting(weightingTotal)}.{" "}
              {canUpdate
                ? "Markers can't start an evaluation against this rubric until that's fixed."
                : "Markers can't start an evaluation against this rubric until the module's coordinator fixes it."}
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
                        {canCreate
                          ? "The rubric exists but has nothing to score against. Add criteria before marking opens."
                          : "The rubric exists but has nothing to score against. Its coordinator adds criteria before marking opens."}
                      </EmptyDescription>
                    </EmptyHeader>
                    {canCreate && (
                      <Button
                        className="h-11 cursor-pointer sm:h-9"
                        onClick={() => openDialog({ kind: "create-criterion" })}
                      >
                        <Plus aria-hidden="true" />
                        Add criterion
                      </Button>
                    )}
                  </Empty>
                </CardContent>
              </Card>
            }
          />
        </div>
      )}

      {moduleId && (dialog.kind === "create-rubric" || dialog.kind === "rename-rubric") && (
        <RubricFormDialog
          key={dialogKey}
          open
          onOpenChange={(next) => !next && closeDialog()}
          mode={dialog.kind === "create-rubric" ? "create" : "edit"}
          moduleId={moduleId}
          rubric={rubric}
          onSuccess={(_mode, message) => toast.success(message)}
        />
      )}

      {moduleId &&
        (dialog.kind === "create-criterion" || dialog.kind === "edit-criterion") && (
          <CriterionFormDialog
            key={dialogKey}
            open
            onOpenChange={(next) => !next && closeDialog()}
            mode={dialog.kind === "create-criterion" ? "create" : "edit"}
            moduleId={moduleId}
            criterion={dialog.kind === "edit-criterion" ? dialog.criterion : undefined}
            // On edit, the criterion being changed is excluded from the running total so the
            // hint reads "this leaves x% unallocated" against its *new* value, not double-counting
            // the old one.
            allocatedElsewhere={
              dialog.kind === "edit-criterion"
                ? weightingTotal - dialog.criterion.weighting
                : weightingTotal
            }
            onSuccess={(_mode, message) => toast.success(message)}
          />
        )}

      <ConfirmDialog
        open={dialog.kind === "delete-rubric"}
        onOpenChange={(next) => !next && closeDialog()}
        title="Delete this rubric?"
        description={
          <>
            {rubric?.title ? `"${rubric.title}"` : "This rubric"} and all{" "}
            {criteria.length} of its criteria will be removed. Markers can&apos;t evaluate anything
            in this module until a new rubric exists. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete rubric"
        pendingLabel="Deleting…"
        destructive
        icon={Trash2}
        isPending={deleteRubric.isPending}
        onConfirm={handleDeleteRubric}
      />

      <ConfirmDialog
        open={dialog.kind === "delete-criterion"}
        onOpenChange={(next) => !next && closeDialog()}
        title="Delete this criterion?"
        description={
          <>
            {dialog.kind === "delete-criterion"
              ? `"${dialog.criterion.label}"`
              : "This criterion"}{" "}
            will be removed from the rubric, and the remaining weightings will no longer total
            100%. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete criterion"
        pendingLabel="Deleting…"
        destructive
        icon={Trash2}
        isPending={deleteCriterion.isPending}
        onConfirm={() =>
          dialog.kind === "delete-criterion" && handleDeleteCriterion(dialog.criterion.id)
        }
      />
    </div>
  );
}
