import { FileClock } from "lucide-react";
import { PageHeader } from "~/components/ui/page-header";

export function meta() {
  return [{ title: "My Projects — GraderPlus" }];
}

export default function MarkerProjects() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="My Projects" icon={FileClock} />
      <p className="text-sm text-muted-foreground">Coming soon.</p>
    </div>
  );
}
