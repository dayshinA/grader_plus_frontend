import { GraduationCap } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The frame for the four screens a signed out person can reach. One column on a phone, a
 * centred card from `sm` up, so the form is the whole screen where the screen is small.
 */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col bg-muted/30 px-4 py-8 sm:items-center sm:justify-center sm:px-6">
      <div className="w-full sm:max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"
          >
            <GraduationCap className="size-5" />
          </span>
          <div className="leading-tight">
            <p className="text-base font-semibold">GraderPlus</p>
            <p className="text-xs text-muted-foreground">Loughborough University</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8">
          <div className="mb-6 space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {description && (
              <div className="text-sm text-muted-foreground">{description}</div>
            )}
          </div>
          {children}
        </div>

        {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </main>
  );
}
