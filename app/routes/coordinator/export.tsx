import { FileSpreadsheet } from "lucide-react";
import { PageHeader } from "~/components/ui/page-header";

export function meta() {
  return [{ title: "Export — GraderPlus" }];
}

export default function Export() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Export" icon={FileSpreadsheet} />
      <p className="text-sm text-muted-foreground">Coming soon.</p>
    </div>
  );
}
