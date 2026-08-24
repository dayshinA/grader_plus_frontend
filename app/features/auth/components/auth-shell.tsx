import type { ReactNode } from "react";

// The frame for the signed out screens. One column on a phone, a centred card from `sm` up.
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
        <div className="mb-8 space-y-3">
          {/* The lockup is a single purple ink on transparent, so on a dark background it
              is flattened to black and inverted to white rather than left to disappear. */}
          <img
            src="/logo_with_text_2.png"
            alt="Loughborough University"
            className="h-9 w-auto dark:brightness-0 dark:invert"
          />
          <p className="text-base font-semibold">GraderPlus</p>
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
