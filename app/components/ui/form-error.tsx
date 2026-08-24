import { TriangleAlert } from "lucide-react";

import { isApiError } from "~/lib/api-client";

// Quiet when every message has found a field, or a failure would be said twice.
export function FormError({ error }: { error: unknown }) {
  if (!error) return null;

  const hasOnlyFieldErrors =
    isApiError(error) && Object.keys(error.fieldErrors).length > 0;
  if (hasOnlyFieldErrors) return null;

  const message = isApiError(error)
    ? error.message
    : "Something went wrong. Please try again.";

  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
