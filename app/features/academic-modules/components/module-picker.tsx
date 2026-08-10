import { GraduationCap } from "lucide-react";

import { Card, CardContent } from "~/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { AcademicModuleResponse } from "~/features/academic-modules/types";

/**
 * The module `Select` every module-scoped screen puts in its `PageHeader`. Pairs with
 * `useModuleSelection`, which owns the `?moduleId=` state behind it.
 *
 * Presentational only — it renders nothing at all when the account has no modules, so a
 * screen can drop it into `PageHeader`'s `actions` slot unconditionally and let
 * `NoModulesCard` carry the explanation instead of an empty dropdown.
 */
export function ModulePicker({
  modules,
  moduleId,
  onModuleChange,
  label = "Select a module",
}: {
  modules: AcademicModuleResponse[];
  moduleId: string | null;
  onModuleChange: (id: string) => void;
  /** Accessible name for the trigger, and its placeholder. */
  label?: string;
}) {
  if (modules.length === 0) return null;

  return (
    <div className="w-full sm:w-72">
      <Select value={moduleId ?? undefined} onValueChange={onModuleChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {modules.map((module) => (
            <SelectItem key={module.id} value={module.id}>
              {module.code} — {module.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * What a module-scoped screen shows instead of itself when the account can't list a
 * single module. Reached both by an account with genuinely none and by the 403 a list
 * endpoint returns when nothing matches (decision #44) — the two are the same thing from
 * the reader's point of view, so they get the same card.
 */
export function NoModulesCard({
  description = "You don't coordinate or administer any modules yet. Ask a System Administrator to create one, or to grant you access to a department.",
}: {
  description?: string;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <Empty className="px-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GraduationCap aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No modules yet</EmptyTitle>
            <EmptyDescription>{description}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
    </Card>
  );
}
