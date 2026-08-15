import { BackLink } from "~/components/ui/back-link";
import { Callout } from "~/components/ui/callout";
import { ErrorCard } from "~/components/ui/error-card";
import { NotFoundPage } from "~/components/ui/not-found-page";
import { PageHeader } from "~/components/ui/page-header";
import { Skeleton } from "~/components/ui/skeleton";
import { useMarkingQueue, useMarkingWorkspace } from "~/features/marking/api/use-marking";
import { DocumentPane } from "~/features/marking/components/document-pane";
import { ScoringForm } from "~/features/marking/components/scoring-form";
import { isApiError, isForbidden, isNotFound } from "~/lib/api-client";

/**
 * The blind marking workspace: the document on the left, the caller's own rubric form on
 * the right, stacking on a phone.
 *
 * Must not render, anywhere on this screen: another marker, their total, their feedback,
 * their annotations, how many markers the project has, or any discrepancy or moderation
 * state. None of that is in any response this screen makes, and none of it is inferred here
 * from timing, a status code or a latency either.
 */
export function MarkingWorkspacePage({ projectId }: { projectId: string }) {
  const { data, isPending, isError, error, refetch, isFetching } =
    useMarkingWorkspace(projectId);
  // The workspace response carries no offering status, so the queue is where a closed
  // offering is visible before the first save discovers it.
  const queue = useMarkingQueue();
  const closed =
    queue.data?.find((item) => item.projectId === projectId)?.offeringStatus === "closed";

  if (isNotFound(error)) {
    return (
      <NotFoundPage
        homeHref="/marking"
        backLabel="Back to my marking"
        title="No such project"
        description="That project does not exist"
        helperText="If it was in your queue a moment ago, it may have been removed by the coordinator."
      />
    );
  }

  if (isError) {
    const refused = isForbidden(error);
    const excluded = isApiError(error) && error.code === "PROJECT_EXCLUDED";

    return (
      <div className="space-y-6">
        <BackLink fallback={{ to: "/marking", label: "my marking" }} />
        <ErrorCard
          title={
            excluded
              ? "This project has been excluded"
              : refused
                ? "You are not on this project"
                : "Could not open this project"
          }
          error={excluded || refused ? undefined : error}
          description={
            excluded
              ? "The coordinator has said this student's work can never be graded, so there is nothing here to mark."
              : refused
                ? "Only the markers assigned to a project can open it. If you were expecting to be on this one, ask the coordinator."
                : undefined
          }
          onRetry={excluded || refused ? undefined : () => void refetch()}
          isRetrying={isFetching}
        />
      </div>
    );
  }

  if (isPending || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-16 rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  const readOnly = closed;

  return (
    <div className="space-y-6">
      <BackLink fallback={{ to: "/marking", label: "my marking" }} />

      <PageHeader
        title={data.project.studentName}
        description={data.project.title}
      />

      {data.project.supervisorName && (
        <p className="text-sm text-muted-foreground">
          Supervised by {data.project.supervisorName}. That is a name on the project and
          nothing else.
        </p>
      )}

      {closed && (
        <Callout variant="warning" title="This offering is closed">
          The marking on it is frozen. What you see is what was recorded, and nothing further
          can be saved.
        </Callout>
      )}

      {data.rubric.criteria.length === 0 && (
        <Callout variant="warning" title="This rubric has no criteria">
          There is nothing to score against. Ask the coordinator to finish the rubric.
        </Callout>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-label="Submitted work" className="min-w-0">
          <DocumentPane files={data.files} readOnly={readOnly} />
        </section>

        <section
          aria-label="Your marking"
          className="min-w-0 lg:sticky lg:top-20 lg:self-start"
        >
          <ScoringForm projectId={projectId} workspace={data} readOnly={readOnly} />
        </section>
      </div>
    </div>
  );
}
