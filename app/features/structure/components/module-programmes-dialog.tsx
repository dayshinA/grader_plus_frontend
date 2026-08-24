import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { FormError } from "~/components/ui/form-error";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton } from "~/components/ui/skeleton";
import { useAuth } from "~/features/auth/api/auth-context";
import { isSystemWide } from "~/features/access/permissions";
import {
  useModuleProgrammes,
  useProgrammes,
  useSetModuleProgrammes,
  useUnits,
} from "~/features/structure/api/use-structure";
import {
  PROGRAMME_LEVEL_LABELS,
  type AcademicUnit,
  type ProjectModule,
} from "~/features/structure/types";

/** The school a unit answers to. Two levels, so this is one hop and never a walk. */
function responsibleSchoolId(unit: AcademicUnit | undefined): string | undefined {
  if (!unit) return undefined;
  return unit.level === "school" ? unit.id : (unit.parentUnitId ?? undefined);
}

// A set editor: saving replaces the links. Cross-school ones are system administrator only.
export function ModuleProgrammesDialog({
  open,
  onOpenChange,
  module,
  unit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: ProjectModule;
  unit: AcademicUnit | undefined;
}) {
  const { grants } = useAuth();
  const systemWide = isSystemWide(grants);

  const { data: units } = useUnits();
  const links = useModuleProgrammes(module.id);
  const save = useSetModuleProgrammes(module.id);

  // Every unit the caller reaches, because a module can serve a programme run elsewhere.
  const unitIds = useMemo(() => (units ?? []).map((candidate) => candidate.id), [units]);

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string> | null>(null);

  const moduleSchoolId = responsibleSchoolId(unit);

  const current = useMemo(
    () => new Set((links.data ?? []).map((link) => link.programmeId)),
    [links.data],
  );
  const chosen = selected ?? current;

  const error = save.error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Programmes for {module.code}</DialogTitle>
          <DialogDescription>
            This replaces the whole set. Whatever is ticked when you save is exactly what the
            module is linked to afterwards, and saving with nothing ticked unlinks it from
            everything.
          </DialogDescription>
        </DialogHeader>

        <FormError error={error} />

        {!systemWide && (
          <Callout variant="info">
            Programmes belonging to another School are service teaching and only a System
            Administrator can link them. They are listed but cannot be ticked.
          </Callout>
        )}

        <div className="space-y-2">
          <Label htmlFor="programme-search">Search</Label>
          <Input
            id="programme-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search programmes by code or title"
            className="h-11 sm:h-9"
          />
        </div>

        <ScrollArea className="h-72 rounded-lg border border-border">
          <div className="divide-y divide-border">
            {links.isPending ? (
              <div className="space-y-2 p-3">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : (
              unitIds.map((candidateUnitId) => (
                <ProgrammesForUnit
                  key={candidateUnitId}
                  unitId={candidateUnitId}
                  units={units ?? []}
                  moduleSchoolId={moduleSchoolId}
                  systemWide={systemWide}
                  search={search}
                  chosen={chosen}
                  onToggle={(programmeId, ticked) => {
                    const next = new Set(chosen);
                    if (ticked) next.add(programmeId);
                    else next.delete(programmeId);
                    setSelected(next);
                  }}
                />
              ))
            )}
          </div>
        </ScrollArea>

        <p className="text-sm text-muted-foreground" aria-live="polite">
          {chosen.size === 0
            ? `Nothing selected. Saving now unlinks ${module.code} from every programme.`
            : `${chosen.size} programme${chosen.size === 1 ? "" : "s"} selected.`}
        </p>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 cursor-pointer sm:h-9"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-11 cursor-pointer sm:h-9"
            disabled={selected === null || save.isPending}
            aria-busy={save.isPending}
            onClick={() =>
              save.mutate([...chosen], {
                onSuccess: ({ message }) => {
                  toast.success(message || "Programme links replaced.");
                  onOpenChange(false);
                },
              })
            }
          >
            {save.isPending ? "Saving" : "Replace links"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProgrammesForUnit({
  unitId,
  units,
  moduleSchoolId,
  systemWide,
  search,
  chosen,
  onToggle,
}: {
  unitId: string;
  units: AcademicUnit[];
  moduleSchoolId: string | undefined;
  systemWide: boolean;
  search: string;
  chosen: Set<string>;
  onToggle: (programmeId: string, ticked: boolean) => void;
}) {
  const { data } = useProgrammes(unitId);
  const unit = units.find((candidate) => candidate.id === unitId);
  const schoolId = responsibleSchoolId(unit);
  const crossSchool = Boolean(moduleSchoolId && schoolId && schoolId !== moduleSchoolId);
  const locked = crossSchool && !systemWide;

  const term = search.trim().toLowerCase();
  const programmes = (data ?? []).filter(
    (programme) =>
      programme.isActive &&
      (!term || `${programme.code} ${programme.title}`.toLowerCase().includes(term)),
  );

  if (programmes.length === 0) return null;

  return (
    <div>
      <p className="bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
        {unit?.name ?? "Unit"}
        {crossSchool && " · service teaching"}
      </p>
      {programmes.map((programme) => {
        const id = `programme-${programme.id}`;
        return (
          <label
            key={programme.id}
            htmlFor={id}
            className={
              locked
                ? "flex cursor-not-allowed items-start gap-3 px-3 py-2.5 opacity-60"
                : "flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-accent/50"
            }
          >
            <Checkbox
              id={id}
              className="mt-0.5"
              disabled={locked}
              checked={chosen.has(programme.id)}
              onCheckedChange={(value) => onToggle(programme.id, value === true)}
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{programme.title}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {programme.code} · {PROGRAMME_LEVEL_LABELS[programme.level]}
                {locked && " · another School runs this"}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
