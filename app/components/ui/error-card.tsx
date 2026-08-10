import type { LucideIcon } from "lucide-react";
import { RotateCw, TriangleAlert } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { isApiError } from "~/lib/api-client";
import { cn } from "~/lib/utils";

/**
 * What a screen shows when its data didn't load.
 *
 * Every list and detail screen needs the same three things here — say what failed, say why in the
 * API's own words, and offer the retry — so this is one component rather than a block copied per
 * screen and drifting.
 *
 * The message comes from the `ApiError` when there is one: "This collection could not be found"
 * tells an admin what to do next, and "Something went wrong" doesn't. Anything that isn't an
 * `ApiError` (a thrown TypeError, a bug in a selector) has no message worth showing, so the
 * fallback stands in.
 */
export function ErrorCard({
  title = "Couldn't load this",
  error,
  description,
  icon: Icon = TriangleAlert,
  onRetry,
  isRetrying = false,
  retryLabel = "Try again",
  action,
  className,
}: {
  title?: string;
  /** The rejected value. An `ApiError` supplies the description; anything else falls back. */
  error?: unknown;
  /** Overrides the message derived from `error` — for a state with no error object behind it. */
  description?: React.ReactNode;
  icon?: LucideIcon;
  onRetry?: () => void;
  isRetrying?: boolean;
  retryLabel?: string;
  /** An escape route beside (or instead of) the retry — e.g. a link back to the list. */
  action?: React.ReactNode;
  className?: string;
}) {
  const message =
    description ??
    (isApiError(error) ? error.message : "Something went wrong. Please try again.");

  return (
    <Card className={className}>
      <CardContent className="py-4">
        <Empty className="px-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Icon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{title}</EmptyTitle>
            <EmptyDescription>{message}</EmptyDescription>
          </EmptyHeader>
          {(onRetry || action) && (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-center">
              {onRetry && (
                <Button
                  variant="outline"
                  className="h-11 cursor-pointer sm:h-9"
                  onClick={onRetry}
                  disabled={isRetrying}
                  aria-busy={isRetrying}
                >
                  <RotateCw
                    className={cn(
                      "size-4",
                      isRetrying && "animate-spin motion-reduce:animate-none",
                    )}
                    aria-hidden="true"
                  />
                  {retryLabel}
                </Button>
              )}
              {action}
            </div>
          )}
        </Empty>
      </CardContent>
    </Card>
  );
}
