import { useState } from "react";
import { MailCheck } from "lucide-react";

import { Callout } from "~/components/ui/callout";
import { FormError } from "~/components/ui/form-error";
import { FormField } from "~/components/ui/form-field";
import { SubmitButton } from "~/components/ui/submit-button";
import { useForgotPassword } from "~/features/auth/api/use-auth";
import { isApiError } from "~/lib/api-client";

/**
 * The route answers the same way whether the address exists, belongs to a deactivated
 * account or matches nothing, so the confirmation is worded as "if that address has an
 * account". Saying anything more would turn this screen into a way of asking who works
 * here.
 */
export function ForgotPasswordForm() {
  const forgot = useForgotPassword();
  const [email, setEmail] = useState("");

  const error = forgot.error;
  const fieldError = (name: string) => (isApiError(error) ? error.fieldError(name) : undefined);

  if (forgot.isSuccess) {
    return (
      <Callout variant="success" title="Check your inbox" icon={<MailCheck className="size-4" />}>
        If that address has an account, a reset link is on its way. The link works once and
        expires, so use it from this device if you can.
      </Callout>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        forgot.mutate({ email });
      }}
      className="space-y-4"
      noValidate
    >
      <FormError error={error} />

      <FormField
        label="Email address"
        name="email"
        type="email"
        autoComplete="username"
        inputMode="email"
        required
        autoFocus
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={fieldError("email")}
      />

      <SubmitButton isPending={forgot.isPending} pendingLabel="Sending">
        Send reset link
      </SubmitButton>
    </form>
  );
}
