import { FolderCheck, Import, Plus } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "~/components/ui/empty";
import { Marquee } from "~/components/ui/marquee";

export function EmptyStateDemo() {
  return (
    <div className="mx-auto max-w-sm">
      <Empty className="px-0 py-8">
        <EmptyHeader>
          <div className="mask-x-from-95% mask-y-from-60% mb-3 w-full max-w-xs space-y-2">
            <Marquee className="h-56 [--duration:2s]" repeat={5} vertical>
              <div className="flex w-full items-center gap-3 rounded-lg border px-4 py-3">
                <FolderCheck className="shrink-0 fill-muted text-muted-foreground/70" />
                <div className="h-5 w-full rounded-lg bg-muted" />
                <div className="ms-auto size-6 shrink-0 rounded-full bg-muted" />
              </div>
            </Marquee>
          </div>
          <EmptyTitle>No Projects Yet</EmptyTitle>
          <EmptyDescription>
            You haven&apos;t created any projects yet. Get started by creating your first
            project.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex flex-wrap gap-2 *:mx-auto">
            <Button>
              <Plus /> Create Project
            </Button>
            <Button variant="outline">
              <Import /> Import Project
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    </div>
  );
}
