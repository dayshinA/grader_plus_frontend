import { CircleAlert, CircleCheck, PlayCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { FormError } from "~/components/ui/form-error";
import { Skeleton } from "~/components/ui/skeleton";
import { useCoverage, useOpenMarking } from "~/features/assignments/api/use-assignments";
import { useRubricValidation } from "~/features/rubrics/api/use-rubrics";
import { pluralise } from "~/utils/format";

const MINIMUM_MARKERS = 2;

// A checklist, so the two conditions are visible rather than discovered when the action fails.
export function CoverageCard({
  offeringId,
  canOpen,
  status,
}: {
  offeringId: string;
  canOpen: boolean;
  status: string;
}) {
  const coverage = useCoverage(offeringId);
  const rubric = useRubricValidation(offeringId);
  const openMarking = useOpenMarking(offeringId);

  if (coverage.isPending || rubric.isPending) {
    return <Skeleton className="h-40 rounded-xl" />;
  }

  const projects = coverage.data ?? [];
  const short = projects.filter((project) => project.markerCount < MINIMUM_MARKERS);
  const rubricValid = rubric.data?.valid ?? false;
  const inSetup = status === "setup";
  const ready = inSetup && rubricValid && projects.length > 0 && short.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ready to open marking?</CardTitle>
        <CardDescription>
          Opening marking is what lets markers start. It cannot be undone by going back to
          setup.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <FormError error={openMarking.error} />

        <ul className="space-y-2">
          <CheckRow
            ok={projects.length > 0}
            label={
              projects.length > 0
                ? `${pluralise(projects.length, "project")} on this offering`
                : "No projects yet. Start with intake."
            }
          />
          <CheckRow
            ok={rubricValid}
            label={rubric.data?.message ?? "The rubric is not ready."}
          />
          <CheckRow
            ok={short.length === 0 && projects.length > 0}
            label={
              short.length === 0
                ? "Every project has at least two markers"
                : `${pluralise(short.length, "project")} with fewer than two markers`
            }
          />
        </ul>

        {short.length > 0 && (
          <Callout variant="warning" title="These projects are short">
            <ul className="mt-1 space-y-0.5">
              {short.slice(0, 12).map((project) => (
                <li key={project.projectId} className="truncate text-xs">
                  {project.studentName} · {pluralise(project.markerCount, "marker")}
                </li>
              ))}
              {short.length > 12 && (
                <li className="text-xs">and {short.length - 12} more</li>
              )}
            </ul>
          </Callout>
        )}

        {!inSetup && (
          <Callout variant="info">
            This offering is already past setup, so marking is open. Assignments can still
            change while it is open, within the same two marker minimum.
          </Callout>
        )}

        {canOpen && inSetup && (
          <Button
            type="button"
            className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto"
            disabled={!ready || openMarking.isPending}
            aria-busy={openMarking.isPending}
            onClick={() =>
              openMarking.mutate(undefined, {
                onSuccess: ({ message }) => toast.success(message || "Marking is open."),
              })
            }
          >
            <PlayCircle className="size-4" aria-hidden="true" />
            {openMarking.isPending ? "Opening" : "Open marking"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  const Icon = ok ? CircleCheck : CircleAlert;
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon
        className={
          ok
            ? "mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400"
            : "mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
        }
        aria-hidden="true"
      />
      <span className={ok ? "text-muted-foreground" : undefined}>{label}</span>
    </li>
  );
}
