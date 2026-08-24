import { useMemo } from "react";
import { Outlet, useLocation, useMatches } from "react-router";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Separator } from "~/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "~/components/ui/sidebar";
import { useAuth } from "~/features/auth/api/auth-context";
import { AppSidebar } from "~/features/dashboard/components/app-sidebar";
import { useHome } from "~/features/dashboard/api/use-dashboard";
import { buildNavGroups, findNavGroupHeading, findNavItem } from "~/features/dashboard/nav";
import { cn } from "~/lib/utils";

// The frame every signed in screen renders inside. The sidebar is a drawer on a phone.
export function AppShell() {
  const { pathname } = useLocation();
  const { grants } = useAuth();
  // A route handle can escape the reading-width cap. The marking workspace does.
  const matches = useMatches();
  const fullWidth = matches.some(
    (match) => (match.handle as { fullWidth?: boolean } | undefined)?.fullWidth,
  );
  // A failure narrows the sidebar rather than blocking the app: /me/home is a convenience.
  const { data: home } = useHome();

  const navGroups = useMemo(() => buildNavGroups(grants, home), [grants, home]);
  const active = findNavItem(navGroups, pathname);
  const groupHeading = active ? findNavGroupHeading(navGroups, active) : undefined;
  const pageTitle = active?.title ?? "GraderPlus";

  return (
    <SidebarProvider>
      <AppSidebar navGroups={navGroups} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border/50 bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
          <SidebarTrigger className="-ml-1 size-9 cursor-pointer sm:size-8" />
          <Separator orientation="vertical" className="h-4" />
          <Breadcrumb>
            <BreadcrumbList className="flex-nowrap">
              {groupHeading && (
                <>
                  {/* Context rather than a destination: group headings have no screen. */}
                  <BreadcrumbItem className="hidden sm:block">
                    <BreadcrumbPage className="text-muted-foreground">
                      {groupHeading}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden sm:block" />
                </>
              )}
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="truncate">{pageTitle}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex-1 p-4 sm:p-6">
          <div className={cn("mx-auto w-full", !fullWidth && "max-w-6xl")}>
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
