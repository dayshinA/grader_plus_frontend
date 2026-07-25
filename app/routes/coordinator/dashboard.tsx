import { LayoutDashboard } from "lucide-react";
import { PageHeader } from "~/components/ui/page-header";

export function meta() {
  return [{ title: "Dashboard — GraderPlus" }];
}

export default function CoordinatorDashboard() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Coordinator Dashboard" icon={LayoutDashboard} />
      <p className="text-sm text-muted-foreground">Coming soon.</p>
    </div>
  );
}
