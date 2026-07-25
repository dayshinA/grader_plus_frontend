import { ScrollText } from "lucide-react";
import { PageHeader } from "~/components/ui/page-header";

export function meta() {
  return [{ title: "Rubrics — GraderPlus" }];
}

export default function Rubrics() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Rubrics" icon={ScrollText} />
      <p className="text-sm text-muted-foreground">Coming soon.</p>
    </div>
  );
}
