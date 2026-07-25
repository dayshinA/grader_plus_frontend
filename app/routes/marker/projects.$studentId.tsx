import { FileText } from "lucide-react";
import { PageHeader } from "~/components/ui/page-header";

export function meta() {
  return [{ title: "Submission — GraderPlus" }];
}

export default function ProjectDetail() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Submission" icon={FileText} />
      <p className="text-sm text-muted-foreground">
        Coming soon. Will hold the submission viewer and evaluation form.
      </p>
    </div>
  );
}
