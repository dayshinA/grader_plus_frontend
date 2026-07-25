import { ClipboardCheck } from "lucide-react";
import { PageHeader } from "~/components/ui/page-header";

export function meta() {
  return [{ title: "Discrepancies — GraderPlus" }];
}

export default function Discrepancies() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Discrepancies" icon={ClipboardCheck} />
      <p className="text-sm text-muted-foreground">Coming soon.</p>
    </div>
  );
}
