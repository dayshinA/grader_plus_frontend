import { FileText } from "lucide-react";

import { BackLink } from "~/components/ui/back-link";
import { PageHeader } from "~/components/ui/page-header";
import { PagePlaceholder } from "~/components/ui/page-placeholder";

export function meta() {
  return [{ title: "Submission — GraderPlus" }];
}

export default function ProjectDetail() {
  return (
    <div className="flex flex-col gap-6">
      <BackLink fallback={{ to: "/marker/projects", label: "My Projects" }} />
      <PageHeader
        title="Submission"
        description="One student's project: the submission on one side, your evaluation on the other."
      />
      <PagePlaceholder
        icon={FileText}
        title="Not built yet"
        description="The submission viewer and the evaluation form will live here."
        planned={[
          "The submitted file, viewable in the browser",
          "The module's rubric, scored criterion by criterion",
          "Annotations against the submission, saved as you work",
        ]}
      />
    </div>
  );
}
