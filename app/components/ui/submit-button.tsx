import { Loader2 } from "lucide-react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

/**
 * Full-width submit with a busy state. Disabled while the request is in flight — a second click on
 * a login or a password change isn't just wasted, it's a duplicate write.
 *
 * `h-11` on mobile for a 44px touch target, easing to the design system's `h-9` from `sm:` up.
 */
export function SubmitButton({
  isPending,
  pendingLabel,
  children,
  className,
  disabled = false,
}: {
  isPending: boolean;
  pendingLabel: string;
  children: React.ReactNode;
  /** Overrides the full-width default — e.g. `sm:w-auto` for a dialog footer. */
  className?: string;
  /**
   * Blocks submission for a reason other than a request being in flight — nothing to save, or a
   * value the form itself knows is unusable. The busy state still wins visually while pending.
   */
  disabled?: boolean;
}) {
  return (
    <Button
      type="submit"
      size="lg"
      disabled={isPending || disabled}
      aria-busy={isPending}
      className={cn("h-11 w-full cursor-pointer sm:h-9", className)}
    >
      {isPending ? (
        <>
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
