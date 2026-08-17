import { useState } from "react";
import { Copy, ScrollText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import { Card, CardContent } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { ErrorCard } from "~/components/ui/error-card";
import { FormError } from "~/components/ui/form-error";
import { Skeleton } from "~/components/ui/skeleton";
import { usePermission } from "~/features/auth/api/auth-context";
import { useOfferingDashboard } from "~/features/dashboard/api/use-dashboard";
import { useCopyRubric, useRubric } from "~/features/rubrics/api/use-rubrics";
import { RubricEditor } from "~/features/rubrics/components/rubric-editor";
import { useOfferingHeader } from "~/features/structure/api/use-offering-header";
import { OfferingPicker } from "~/features/structure/components/offering-picker";

function CopyRubricDialog({
  open,
  onOpenChange,
  offeringId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offeringId: string;
}) {
  const copy = useCopyRubric(offeringId);
  const [sourceId, setSourceId] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Copy a rubric</DialogTitle>
          <DialogDescription>
            Nothing is carried between academic years automatically, so this is the deliberate
            way to reuse last year's criteria. It replaces whatever this offering has now.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormError error={copy.error} />

          <OfferingPicker
            value={sourceId}
            onChange={setSourceId}
            excludeOfferingId={offeringId}
            label="Copy from"
            hint="You need a role covering the offering you are copying from, not just this one."
          />
        </div>

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
            disabled={!sourceId || copy.isPending}
            aria-busy={copy.isPending}
            onClick={() =>
              copy.mutate(sourceId, {
                onSuccess: ({ message }) => {
                  toast.success(message || "Rubric copied.");
                  onOpenChange(false);
                },
              })
            }
          >
            {copy.isPending ? "Copying" : "Copy rubric"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The rubric for one offering. A 404 from the read is a normal state during setup rather
 * than a failure, so the screen offers an empty editor instead of an error.
 */
export function RubricPage({ offeringId }: { offeringId: string }) {
  const canWrite = usePermission("rubric.write");
  const { offering } = useOfferingHeader(offeringId);
  const { data: dashboard } = useOfferingDashboard(offeringId);
  const rubric = useRubric(offeringId);

  const [copyOpen, setCopyOpen] = useState(false);
  const [startEmpty, setStartEmpty] = useState(false);

  const closed = offering?.isClosed ?? false;

  // The server locks structural edits once any evaluation exists. There is no route that
  // says so directly, but a marker who is past "not started" has one.
  const anyMarkingStarted = (dashboard?.projects ?? []).some((project) =>
    project.markers.some((marker) => marker.state !== "not_started"),
  );

  if (rubric.isError && !rubric.isMissing) {
    return (
      <ErrorCard
        title="Could not load the rubric"
        error={rubric.error}
        onRetry={() => void rubric.refetch()}
        isRetrying={rubric.isFetching}
      />
    );
  }

  if (rubric.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }

  if (rubric.isMissing && !startEmpty) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-4">
            <Empty className="px-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ScrollText aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No rubric yet</EmptyTitle>
                <EmptyDescription>
                  Markers cannot start until this offering has one whose weightings total 100.
                  Write it here, or copy the criteria from another year of the same module.
                </EmptyDescription>
              </EmptyHeader>
              {canWrite && !closed && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    className="h-11 cursor-pointer sm:h-9"
                    onClick={() => setStartEmpty(true)}
                  >
                    Write a rubric
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 cursor-pointer sm:h-9"
                    onClick={() => setCopyOpen(true)}
                  >
                    <Copy className="size-4" aria-hidden="true" />
                    Copy from another offering
                  </Button>
                </div>
              )}
            </Empty>
          </CardContent>
        </Card>

        {copyOpen && (
          <CopyRubricDialog open={copyOpen} onOpenChange={setCopyOpen} offeringId={offeringId} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!canWrite && (
        <Callout variant="info">
          You can read this rubric but not change it. Only the offering's coordinator can
          edit it.
        </Callout>
      )}

      {canWrite && !closed && !anyMarkingStarted && rubric.data && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            className="h-11 cursor-pointer sm:h-9"
            onClick={() => setCopyOpen(true)}
          >
            <Copy className="size-4" aria-hidden="true" />
            Replace with a copy
          </Button>
        </div>
      )}

      <RubricEditor
        // Remounts when the underlying document changes, so the draft starts from it.
        key={rubric.data?.updatedAt ?? "new"}
        offeringId={offeringId}
        rubric={rubric.data}
        locked={anyMarkingStarted}
        readOnly={closed || !canWrite}
      />

      {copyOpen && (
        <CopyRubricDialog open={copyOpen} onOpenChange={setCopyOpen} offeringId={offeringId} />
      )}
    </div>
  );
}
