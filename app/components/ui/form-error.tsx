import { TriangleAlert } from "lucide-react";

import { isApiError } from "~/lib/api-client";

/**
 * Form-level failure banner: the part of an error that isn't attached to a single field.
 *
 * Field-level messages are rendered by the fields themselves (from `ApiError.fieldErrors`), so
 * this deliberately stays quiet when *every* message has already found a field — otherwise a
 * validation failure would say the same thing twice. A rule violation with no field attached
 * (wrong password, a 422 the API raised on its own terms, a dropped connection) has nowhere else
 * to go, and shows here.
 */
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
