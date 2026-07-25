import { ListChecks } from "lucide-react";
import { PageHeader } from "~/components/ui/page-header";

export function meta() {
  return [{ title: "Marker Assignments — GraderPlus" }];
}

export default function MarkerAssignments() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Marker Assignments" icon={ListChecks} />
      <p className="text-sm text-muted-foreground">Coming soon.</p>
    </div>
  );
}
