import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

import { backTo, useDeclaredBackTarget } from "~/hooks/use-back-link";
import { cn } from "~/lib/utils";

// Shows the navigation that actually happened. No declared target means no back link.
export function BackLink({ className }: { className?: string }) {
  const target = useDeclaredBackTarget();

  if (!target) {
    return null;
  }

  return (
    <Link
      to={target.to}
      // Going back is a new navigation, so the step behind this one is handed along.
      state={target.back ? backTo(target.back) : undefined}
      className={cn(
        // 44px tall on a phone so it is a real tap target, text height from sm: up.
        "inline-flex h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:h-auto",
        className,
      )}
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back to {target.label}
    </Link>
  );
}
