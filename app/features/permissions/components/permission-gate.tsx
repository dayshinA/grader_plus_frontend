import { ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent } from "~/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { PageHeader } from "~/components/ui/page-header";
import { useAuth } from "~/features/auth/api/auth-context";
import type { PermissionKey } from "~/features/permissions/types";
import { hasAnyPermission } from "~/features/permissions/utils";

export interface PermissionGateProps {
  /** **Any-of.** Holding one of these renders `children`. */
  permissions: PermissionKey[];
  /** Title for the fallback's `PageHeader`, so the blocked page still looks like the page asked for. */
  title: string;
  /** One line under the title on the fallback — usually the screen's own `nav.ts` description. */
  description?: string;
  /** Overrides the default explanatory copy in the fallback. */
  message?: ReactNode;
  children: ReactNode;
}

/**
 * In-page permission gate: renders `children`, or a titled empty state
 * explaining that this section isn't available to the account.
 *
 * Used *inside* a page rather than as another layout route in `routes.ts`
 * (decision #39). Nesting a layout per permission would balloon the route tree
 * and bounce the user to /unauthorized, losing the context of where they were;
 * an in-page empty state keeps the nav, the header and the URL intact, which
 * reads far better for a screen that is simply out of scope for this user
 * rather than forbidden outright.
 *
 * The outer `require-*.tsx` wrappers stay the coarse group gate. This is the
 * per-screen refinement — a department-scoped Project Coordinator passes
 * `require-workspace` on `modules.create` alone, and this is what stops Export
 * and Discrepancies from rendering broken screens for them.
 *
 * ⚠️ UX only. The check is scope-blind (`permissionKeys` is a union across
 * every assignment) and this is not a security boundary — the server re-checks
 * every request, and a screen behind this gate must still handle a 403.
 */
export function PermissionGate({
  permissions,
  title,
  description,
  message,
  children,
}: PermissionGateProps) {
  const { permissions: summary } = useAuth();

  if (hasAnyPermission(summary, permissions)) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="py-4">
          <Empty className="px-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShieldAlert aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Not available for your account</EmptyTitle>
              <EmptyDescription>
                {message ??
                  "You don't have permission to use this section. If you think you should, ask an administrator to review your roles."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    </div>
  );
}
