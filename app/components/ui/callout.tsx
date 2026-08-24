import { cva, type VariantProps } from "class-variance-authority";
import { CircleCheck, Info, OctagonX, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

const calloutVariants = cva(
  "flex items-start gap-2 rounded-lg border p-3 text-sm [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        info: "border-border bg-muted/40 text-muted-foreground",
        success:
          "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400",
        warning:
          "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        error: "border-destructive/30 bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: { variant: "info" },
  },
);

const icons = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: OctagonX,
} as const;

// Standing context, not a toast: no dismiss, no timeout, no animation.
export function Callout({
  variant = "info",
  title,
  children,
  icon,
  className,
}: VariantProps<typeof calloutVariants> & {
  /** Optional bold first line. Without it the body is the whole message. */
  title?: ReactNode;
  children: ReactNode;
  /** Overrides the variant's default icon. Pass `null` for none. */
  icon?: ReactNode | null;
  className?: string;
}) {
  const Icon = icons[variant ?? "info"];

  return (
    <div
      role={variant === "error" ? "alert" : "note"}
      className={cn(calloutVariants({ variant }), className)}
    >
      {icon === null ? null : (icon ?? <Icon aria-hidden="true" />)}
      <div className="min-w-0 space-y-0.5">
        {title && <p className="font-medium">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}
