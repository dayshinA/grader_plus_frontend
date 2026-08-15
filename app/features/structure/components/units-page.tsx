import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Building2, ChevronRight, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { ErrorCard } from "~/components/ui/error-card";
import { ListToolbar } from "~/components/ui/list-toolbar";
import { PageHeader } from "~/components/ui/page-header";
import { Skeleton } from "~/components/ui/skeleton";
import { usePermission } from "~/features/auth/api/auth-context";
import { useUnits, useUpdateUnit } from "~/features/structure/api/use-structure";
import { UnitFormDialog } from "~/features/structure/components/unit-form-dialog";
import {
  ACADEMIC_UNIT_KIND_LABELS,
  type AcademicUnit,
} from "~/features/structure/types";

interface UnitNode {
  unit: AcademicUnit;
  children: AcademicUnit[];
}

/** Two levels, so this is a group by rather than a recursive walk. */
function buildTree(units: AcademicUnit[]): UnitNode[] {
  const schools = units.filter((unit) => unit.level === "school");
  const constituents = units.filter((unit) => unit.level === "constituent_unit");

  const nodes: UnitNode[] = schools
    .map((school) => ({
      unit: school,
      children: constituents
        .filter((child) => child.parentUnitId === school.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.unit.name.localeCompare(b.unit.name));

  // A unit admin scoped to one constituent unit sees it without its parent, so it still
  // needs somewhere to render rather than vanishing out of the tree.
  const orphans = constituents.filter(
    (child) => !schools.some((school) => school.id === child.parentUnitId),
  );
  for (const orphan of orphans) {
    nodes.push({ unit: orphan, children: [] });
  }

  return nodes;
}

function UnitRow({
  unit,
  nested,
  canEdit,
  onEdit,
  onToggleActive,
}: {
  unit: AcademicUnit;
  nested?: boolean;
  canEdit: boolean;
  onEdit: (unit: AcademicUnit) => void;
  onToggleActive: (unit: AcademicUnit) => void;
}) {
  return (
    <div
      className={
        nested
          ? "flex flex-col gap-2 border-t border-border py-3 pl-4 sm:flex-row sm:items-center sm:justify-between sm:pl-10"
          : "flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
      }
    >
      <div className="flex min-w-0 items-center gap-2">
        {nested && (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/units/${unit.id}/dashboard`}
              className={
                nested
                  ? "truncate underline-offset-4 hover:underline"
                  : "truncate font-medium underline-offset-4 hover:underline"
              }
            >
              {unit.name}
            </Link>
            {unit.code && (
              <span className="font-mono text-xs text-muted-foreground">{unit.code}</span>
            )}
            {!unit.isActive && <Badge variant="outline">Deactivated</Badge>}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {ACADEMIC_UNIT_KIND_LABELS[unit.unitKind]}
          </p>
        </div>
      </div>

      {canEdit && (
        <div className="flex shrink-0 gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 cursor-pointer"
            onClick={() => onEdit(unit)}
          >
            <Pencil className="size-4" aria-hidden="true" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 cursor-pointer"
            onClick={() => onToggleActive(unit)}
          >
            {unit.isActive ? "Deactivate" : "Reactivate"}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * The academic hierarchy, as a two level tree and nothing deeper. There is no delete here
 * because the API only deactivates, and a unit with academic history stays in the data.
 */
export function UnitsPage() {
  const canCreate = usePermission("unit.create");
  const canEdit = usePermission("unit.update");
  const { data, isLoading, isError, error, refetch, isFetching } = useUnits();
  const update = useUpdateUnit();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicUnit | undefined>();
  const [deactivating, setDeactivating] = useState<AcademicUnit | undefined>();

  const units = useMemo(() => data ?? [], [data]);
  const schools = useMemo(() => units.filter((unit) => unit.level === "school"), [units]);

  const tree = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return buildTree(units);

    const matches = (unit: AcademicUnit) =>
      `${unit.name} ${unit.code ?? ""}`.toLowerCase().includes(term);

    // A School stays visible when one of its constituent units matches, otherwise the
    // match would appear with no context around it.
    return buildTree(units)
      .map((node) => ({
        unit: node.unit,
        children: node.children.filter((child) => matches(child) || matches(node.unit)),
      }))
      .filter((node) => matches(node.unit) || node.children.length > 0);
  }, [units, search]);

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(unit: AcademicUnit) {
    setEditing(unit);
    setFormOpen(true);
  }

  function confirmToggle() {
    if (!deactivating) return;
    update.mutate(
      { id: deactivating.id, payload: { isActive: !deactivating.isActive } },
      {
        onSuccess: ({ message }) => {
          toast.success(message || "Unit updated.");
          setDeactivating(undefined);
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic units"
        description="Schools and the constituent units beneath them. Two levels, and no deeper."
        actions={
          canCreate && (
            <Button className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto" onClick={openCreate}>
              <Plus className="size-4" aria-hidden="true" />
              New unit
            </Button>
          )
        }
      />

      {isError ? (
        <ErrorCard
          title="Could not load academic units"
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      ) : (
        <>
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchLabel="Search units by name or code"
            placeholder="Search units"
          />

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          ) : tree.length === 0 ? (
            <Card>
              <CardContent className="py-4">
                <Empty className="px-0">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Building2 aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>
                      {search ? "No units match that search" : "No academic units yet"}
                    </EmptyTitle>
                    <EmptyDescription>
                      {search
                        ? "Try a shorter term, or clear the search."
                        : "The structure starts with a School. Everything else, programmes, modules and offerings alike, hangs off one."}
                    </EmptyDescription>
                  </EmptyHeader>
                  {!search && canCreate && (
                    <Button className="h-11 cursor-pointer sm:h-9" onClick={openCreate}>
                      <Plus className="size-4" aria-hidden="true" />
                      New unit
                    </Button>
                  )}
                </Empty>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {tree.map((node) => (
                <Card key={node.unit.id}>
                  <CardContent className="py-2">
                    <UnitRow
                      unit={node.unit}
                      canEdit={canEdit}
                      onEdit={openEdit}
                      onToggleActive={setDeactivating}
                    />
                    {node.children.map((child) => (
                      <UnitRow
                        key={child.id}
                        unit={child}
                        nested
                        canEdit={canEdit}
                        onEdit={openEdit}
                        onToggleActive={setDeactivating}
                      />
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {formOpen && (
        <UnitFormDialog
          // Remounts per target so the fields start from the right values.
          key={editing?.id ?? "new"}
          open={formOpen}
          onOpenChange={setFormOpen}
          unit={editing}
          schools={schools}
        />
      )}

      <ConfirmDialog
        open={Boolean(deactivating)}
        onOpenChange={(open) => !open && setDeactivating(undefined)}
        title={deactivating?.isActive ? "Deactivate this unit?" : "Reactivate this unit?"}
        description={
          deactivating?.isActive
            ? `${deactivating.name} stops appearing in pickers. Nothing is deleted, and its academic history stays readable. Deactivating is refused while any offering beneath it is still open.`
            : `${deactivating?.name ?? "This unit"} goes back into the pickers.`
        }
        confirmLabel={deactivating?.isActive ? "Deactivate" : "Reactivate"}
        pendingLabel="Saving"
        destructive={deactivating?.isActive}
        isPending={update.isPending}
        onConfirm={confirmToggle}
      />
    </div>
  );
}
