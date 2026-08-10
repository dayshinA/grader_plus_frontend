import { Upload } from "lucide-react";

import { PageHeader } from "~/components/ui/page-header";
import { PagePlaceholder } from "~/components/ui/page-placeholder";
import { findNavItem } from "~/features/dashboard/nav";
import { PermissionGate } from "~/features/permissions/components/permission-gate";

export function meta() {
  return [{ title: "Submissions — GraderPlus" }];
}

const nav = findNavItem("/workspace/submissions");

export default function Submissions() {
  return (
    <PermissionGate
      permissions={["submissions.upload"]}
      title="Submissions"
      description={nav?.description}
    >
      <div className="flex flex-col gap-6">
        <PageHeader title="Submissions" description={nav?.description} />
        <PagePlaceholder
          icon={Upload}
          title="Not built yet"
          description="Submissions pulled from Learn will be listed here, ready to be assigned out to markers."
          planned={[
            "The submissions imported for a module, with student, file and upload date",
            "Download of a student's raw submission file",
            "Which projects still have no marker assigned",
          ]}
        />
        {/*
          CH-18 (Phase 4) note for whoever builds this screen: gate any download control on
          `submissions.download`, not on the more general `submissions.upload` this route uses.
          `submissions.download` is a Project Coordinator default only at module scope — it is
          absent from both the School Admin and Department Admin templates, and
          `SubmissionAccessGuard` reads `module.coordinator_id` directly and, uniquely in this
          system, does not cascade to School/Department Admin (a deliberately preserved backend
          quirk, not an oversight — see the guard's own comment and the backend plan). Net effect:
          a Department Admin can open every module screen in their department and manage its
          rubric, markers and grades, but cannot download a student's raw submission file. Handle
          the resulting 403/404 (this guard returns either, depending on the branch) the same way
          as any other read — this one is real, not a CH-17 empty-state case, since a missing
          download control on an otherwise-populated list is a genuine permission boundary, not
          "nothing to list".
        */}
      </div>
    </PermissionGate>
  );
}
