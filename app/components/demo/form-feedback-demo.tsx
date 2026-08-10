import { useState } from "react";

import { FormError } from "~/components/ui/form-error";
import { SubmitButton } from "~/components/ui/submit-button";
import { ApiError } from "~/lib/api-client";

const networkError = new ApiError({
  success: false,
  statusCode: 0,
  code: "NETWORK_ERROR",
  message: "Can't reach the server. Check your connection and try again.",
});

const fieldOnlyError = new ApiError({
  success: false,
  statusCode: 422,
  code: "VALIDATION_ERROR",
  message: "The given data was invalid.",
  errors: [{ field: "email", message: "That email address is already in use." }],
});

/** Both halves of a form's feedback: the banner for what isn't field-specific, and the submit. */
export function FormFeedbackDemo() {
  const [pending, setPending] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    window.setTimeout(() => setPending(false), 1500);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
      <FormError error={networkError} />

      {/* Renders nothing: every message here already belongs to a field, so the field says it. */}
      <FormError error={fieldOnlyError} />

      <SubmitButton isPending={pending} pendingLabel="Saving…">
        Save changes
      </SubmitButton>
      <p className="text-xs text-muted-foreground">
        A second FormError is mounted above with only field-level messages — it stays silent so a
        validation failure isn&rsquo;t stated twice.
      </p>
    </form>
  );
}
