import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

import { useBackLink, type BackTarget } from "~/hooks/use-back-link";
import { cn } from "~/lib/utils";

/**
 * The "← Back to X" link at the top of every detail screen. Where it points is decided by whoever
 * linked in (see `backTo`), not by the screen — so a collection opened from a client's page goes
 * back to that client, and one opened from the list goes back to the list, filters intact.
 *
 * `fallback` is what a cold entry gets: a pasted link or a refresh carries no history state, and
 * the domain's own list is the right answer then.
 */
export function BackLink({ fallback, className }: { fallback: BackTarget; className?: string }) {
  const target = useBackLink(fallback);

  return (
    <Link
      to={target.to}
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
