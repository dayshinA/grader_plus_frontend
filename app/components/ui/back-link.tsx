import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

import { backTo, useDeclaredBackTarget } from "~/hooks/use-back-link";
import { cn } from "~/lib/utils";

/**
 * The back link at the top of a detail screen or a tabbed frame. It reports the navigation
 * that actually happened: an offering opened from a unit goes back to that unit, and the
 * same offering opened from home goes back to home.
 *
 * With nothing declared there is nothing to report, and it renders nothing. Reaching a
 * screen from the sidebar, a pasted link or a refresh is not arriving from somewhere, and a
 * link claiming otherwise is worse than no link: the sidebar is still on screen either way.
 *
 * There is no fallback to pass. A screen that needs a destination regardless of route, a 404
 * with nowhere else to send somebody, states that destination itself rather than dressing it
 * up as a return trip.
 */
export function BackLink({ className }: { className?: string }) {
  const target = useDeclaredBackTarget();

  if (!target) {
    return null;
  }

  return (
    <Link
      to={target.to}
      // Going back is a new navigation, so the step before this one has to be handed back
      // to the screen we are returning to or its own back link degrades to a fallback.
      state={target.back ? backTo(target.back) : undefined}
      className={cn(
        // 44px tall on a phone so it's a real tap target; back to text height from sm: up.
        "inline-flex h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:h-auto",
        className,
      )}
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back to {target.label}
    </Link>
  );
}
