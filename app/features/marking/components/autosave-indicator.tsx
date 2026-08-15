import { CircleAlert, CircleCheck, Loader2 } from "lucide-react";

import { isApiError } from "~/lib/api-client";
import type { AutosaveState } from "~/features/marking/hooks/use-autosave";
import { cn } from "~/lib/utils";

/**
 * Autosave failing has to be visible, and a closed offering has to read as "this offering
 * is closed" rather than as a generic failure, because it is the one refusal a marker can
 * hit that is not their fault and not fixable by retrying.
 */
export function AutosaveIndicator({
  state,
  error,
  className,
}: {
  state: AutosaveState;
  error?: unknown;
  className?: string;
}) {
  if (state === "idle") return null;

  if (state === "failed") {
    const closed = isApiError(error) && error.statusCode === 403;
    return (
      <p
        role="alert"
        className={cn("flex items-start gap-1.5 text-xs text-destructive", className)}
      >
        <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>
          {closed
            ? "This offering is closed, so nothing more can be saved on it. Your typing is still here, but it will not persist."
            : isApiError(error)
              ? error.message
              : "Could not save. Your work is still on screen, so nothing is lost yet."}
        </span>
      </p>
    );
  }

  return (
    <p
      aria-live="polite"
      className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}
    >
      {state === "saved" ? (
        <>
          <CircleCheck className="size-3.5 text-green-600 dark:text-green-400" aria-hidden="true" />
          Saved
        </>
      ) : (
        <>
          <Loader2
            className="size-3.5 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          {state === "saving" ? "Saving" : "Unsaved changes"}
        </>
      )}
    </p>
  );
}
