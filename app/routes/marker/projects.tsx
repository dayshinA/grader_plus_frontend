import { FileClock } from "lucide-react";

import { PageHeader } from "~/components/ui/page-header";
import { PagePlaceholder } from "~/components/ui/page-placeholder";
import { findNavItem } from "~/features/dashboard/nav";

export function meta() {
  return [{ title: "My Projects — GraderPlus" }];
}

const nav = findNavItem("/marker/projects");

export default function MarkerProjects() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My Projects" description={nav?.description} />
      <PagePlaceholder
        icon={FileClock}
        title="Not built yet"
        description="The projects assigned to you. You see your own marking and nothing anyone else has entered — that isolation is enforced by the server, not by this screen."
        planned={[
          "Every project assigned to you, and whether you have submitted a score",
          "The submission itself, alongside the module's rubric",
          "Your own evaluation, with annotations, saved as you go",
        ]}
      />
    </div>
  );
}
