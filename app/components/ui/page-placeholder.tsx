import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "~/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";

/**
 * Stands in for a screen that is routed and navigable but not built yet.
 *
 * It deliberately says what the screen *will* do — an unbuilt screen that looks broken and an
 * unbuilt screen that looks planned are very different things to hand a colleague. `planned`
 * lists the concrete capabilities so the scaffold doubles as the spec for the real screen.
 */
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
