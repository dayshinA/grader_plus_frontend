import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "~/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";

// A routed screen that is not built yet. `planned` doubles as its spec.
export function PagePlaceholder({
  icon: Icon,
  title,
  description,
  planned,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  planned?: string[];
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <Empty className="px-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Icon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{title}</EmptyTitle>
            <EmptyDescription>{description}</EmptyDescription>
          </EmptyHeader>

          {planned && planned.length > 0 && (
            <div className="w-full max-w-md text-left">
              <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Planned here
              </p>
              <ul className="space-y-1.5">
                {planned.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2.5 text-sm text-muted-foreground before:mt-2 before:size-1.5 before:shrink-0 before:rounded-full before:bg-border"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Empty>
      </CardContent>
    </Card>
  );
}
