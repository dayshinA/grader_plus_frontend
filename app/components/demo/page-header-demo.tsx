import { Download, Plus } from "lucide-react";

import { Button } from "~/components/ui/button";
import { PageHeader } from "~/components/ui/page-header";

export function PageHeaderDemo() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Modules"
        description="The modules you coordinate — create one, or change its details."
        actions={
          <>
            <Button variant="outline" className="h-11 cursor-pointer sm:h-9">
              <Download className="size-4" aria-hidden="true" />
              Export
            </Button>
            <Button className="h-11 cursor-pointer sm:h-9">
              <Plus className="size-4" aria-hidden="true" />
              Add module
            </Button>
          </>
        }
      />
      <PageHeader title="Rubrics" description="Without any actions." />
    </div>
  );
}
