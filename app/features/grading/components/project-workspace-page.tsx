import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router";

import { Badge } from "~/components/ui/badge";
import { BackLink } from "~/components/ui/back-link";
import { Callout } from "~/components/ui/callout";
import { PageHeader } from "~/components/ui/page-header";
import { Skeleton } from "~/components/ui/skeleton";
import { useMarkerDashboard } from "~/features/dashboard/api/use-marker-dashboard";
import { EvaluationPanel } from "~/features/grading/components/evaluation-panel";
import { SubmissionViewer } from "~/features/grading/components/submission-viewer";

/**
 * One project, end to end: the submission on the left, the marker's evaluation on the right.
 *
 * `?moduleId=` is required and comes from the row that linked here. It isn't derivable on this
 * screen — every grading route is nested under a module, and a Marker holds no `modules.view`, so
 * there is no endpoint that would turn a student uuid into its module. Losing the parameter (a
 * pasted or bookmarked URL) is therefore a real state, and it gets an explanation with a way back
 * rather than a broken request.
 *
 * The header's student name comes from the already-cached marker dashboard rather than a lookup:
 * a Marker has no student-detail endpoint at all, and the list they arrived from carries
 * everything the header needs.
 */
export function ProjectWorkspacePage() {
  const { studentId } = useParams();
  const [searchParams] = useSearchParams();
  const moduleId = searchParams.get("moduleId");

  const { data, isLoading } = useMarkerDashboard();
  const assignment = useMemo(
    () =>
      (data ?? []).find(
        (item) => item.studentId === studentId && item.moduleId === moduleId,
      ),
    [data, studentId, moduleId],
  );

  const back = <BackLink fallback={{ to: "/marker/projects", label: "My Projects" }} />;

  if (!studentId || !moduleId) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <PageHeader title="Project" />
        <Callout variant="warning" title="This link is incomplete">
          <p>
            It's missing the module this project belongs to, so there's nothing to open. Go back to
            My Projects and pick it from the list.
          </p>
        </Callout>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {back}

      <PageHeader
        title={assignment?.studentFullName ?? (isLoading ? "Loading…" : "Project")}
        description={
          assignment
            ? `${assignment.projectTitle} · ${assignment.moduleCode} ${assignment.moduleName}`
            : "Read the submission, score the rubric, and submit when you're done."
        }
        actions={
          assignment?.assignmentRole === "moderator" ? (
            <Badge variant="outline">Moderator</Badge>
          ) : undefined
        }
      />

      {isLoading && !assignment && <Skeleton className="h-5 w-64" />}

      {/* Submission first in the DOM so it's what a narrow screen shows first — you read before
          you score. Wide screens put them side by side, with the reading pane given the extra
          width. */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] xl:items-start">
        <SubmissionViewer moduleId={moduleId} studentId={studentId} />
        <EvaluationPanel moduleId={moduleId} studentId={studentId} />
      </div>
    </div>
  );
}
