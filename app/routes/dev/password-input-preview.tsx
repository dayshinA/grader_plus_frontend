import { useId, useState } from "react";

import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { PasswordInput } from "~/components/ui/password-input";
import { generateSecurePassword } from "~/utils/generate-password";

export default function PasswordInputPreview() {
  const basicId = useId();
  const disabledId = useId();
  const generatedId = useId();
  const [generated, setGenerated] = useState("");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6 sm:p-10">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        PasswordInput — manual QA preview
      </h1>

      <section className="flex flex-col gap-2">
        <Label htmlFor={basicId}>Password</Label>
        <PasswordInput id={basicId} autoComplete="new-password" placeholder="Enter a password" />
      </section>

      <section className="flex flex-col gap-2">
        <Label htmlFor={disabledId}>Disabled</Label>
        <PasswordInput id={disabledId} disabled placeholder="Not editable" />
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={generatedId}>With a &quot;Generate&quot; action</Label>
          <Button
            className="h-auto p-0 text-xs"
            onClick={() => setGenerated(generateSecurePassword())}
            type="button"
            variant="link"
          >
            Generate secure password
          </Button>
        </div>
        <PasswordInput
          id={generatedId}
          autoComplete="new-password"
          onChange={(event) => setGenerated(event.target.value)}
          value={generated}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Keyboard focus check</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Tab into a field, then tab again — the show/hide toggle should get a visible focus ring and
          toggle the field&apos;s visibility on Enter/Space.
        </p>
      </section>
    </div>
  );
}
