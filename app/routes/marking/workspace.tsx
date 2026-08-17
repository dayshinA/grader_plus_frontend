import { useParams } from "react-router";

import { usePermission } from "~/features/auth/api/auth-context";
import { RequirePermission } from "~/features/auth/components/protected-route";
import { MarkingWorkspacePage } from "~/features/marking/components/marking-workspace-page";

export function meta() {
  return [{ title: "Marking | GraderPlus" }];
}

// Read by the shell: the document pane is the work surface, so this screen gets the whole
// window instead of the reading-width cap every other screen sits in.
export const handle = { fullWidth: true };

export default function MarkingWorkspaceRoute() {
  const { projectId = "" } = useParams();
  const allowed = usePermission("marking.work");

  return (
    <RequirePermission allowed={allowed} what="marking">
      <MarkingWorkspacePage projectId={projectId} />
    </RequirePermission>
  );
}
