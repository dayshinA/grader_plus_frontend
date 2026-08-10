import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

/**
 * Shared frame for the unauthenticated screens. Feature-local rather than in `components/ui/`:
 * it encodes auth-page layout, not a general primitive.
 *
 * Mobile-first — full-bleed and vertically centred on a phone, capped and lifted into a card from
 * `sm:` up. `min-h-dvh` rather than `min-h-screen` so the mobile browser chrome doesn't push the
 * submit button below the fold.
 */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col justify-center bg-muted/30 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <img
            src="/logo_only_no_text.jpeg"
            alt=""
            aria-hidden="true"
            className="size-8 rounded-md object-contain"
          />
          <span className="text-sm font-medium text-muted-foreground">
            GraderPlus · Loughborough University
          </span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>

        {footer && <div className="mt-6 text-center text-xs text-muted-foreground">{footer}</div>}
      </div>
    </main>
  );
}
