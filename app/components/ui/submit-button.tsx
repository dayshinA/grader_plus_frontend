import { Loader2 } from "lucide-react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

// Disabled in flight, because a second click on a password change is a duplicate write.
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
  /** Overrides the full-width default, for example `sm:w-auto` in a dialog footer. */
  className?: string;
  // Blocks submission for a reason other than a request in flight.
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
