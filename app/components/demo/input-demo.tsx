import { useId } from "react";

import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export function InputDemo() {
  const helperId = useId();
  const errorId = useId();

  return (
    <div className="flex flex-col gap-6 sm:flex-row">
      <div className="min-w-0 max-w-sm flex-1 space-y-2">
        <Label htmlFor={helperId}>Input with helper text</Label>
        <Input id={helperId} placeholder="Email" type="email" />
        <p
          className="mt-2 text-xs text-muted-foreground"
          role="region"
          aria-live="polite"
        >
          We won&rsquo;t share your email with anyone
        </p>
      </div>

      <div className="min-w-0 max-w-sm flex-1 space-y-2">
        <Label htmlFor={errorId}>Input with error</Label>
        <Input
          id={errorId}
          placeholder="Email"
          type="email"
          defaultValue="invalid@email.com"
          aria-invalid
        />
        <p
          className="mt-2 text-xs text-destructive"
          role="alert"
          aria-live="polite"
        >
          Email is invalid
        </p>
      </div>
    </div>
  );
}
