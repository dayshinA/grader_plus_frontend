import { Eye, EyeOff } from "lucide-react";
import * as React from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

export type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type">;

/** `Input` with a leading `type="password"` plus a trailing show/hide toggle —
 * every password field in the app should use this instead of a raw
 * `<Input type="password">` so the toggle behavior/placement stays consistent. */
const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);

    return (
      <div className="relative">
        <Input
          {...props}
          ref={ref}
          className={cn("pr-9", className)}
          type={visible ? "text" : "password"}
        />
        <Button
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 h-9 w-9 text-muted-foreground hover:text-foreground"
          onClick={() => setVisible((current) => !current)}
          size="icon"
          type="button"
          variant="ghost"
        >
          {visible ? (
            <EyeOff aria-hidden className="size-4" />
          ) : (
            <Eye aria-hidden className="size-4" />
          )}
        </Button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
