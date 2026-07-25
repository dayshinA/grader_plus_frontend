import { Upload } from "lucide-react";
import { PageHeader } from "~/components/ui/page-header";

export function meta() {
  return [{ title: "Submissions — GraderPlus" }];
}

export default function CoordinatorSubmissions() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Submissions" icon={Upload} />
      <p className="text-sm text-muted-foreground">Coming soon.</p>
    </div>
  );
}
