import { useMemo } from "react";
import { Outlet, useLocation } from "react-router";

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

/**
 * The frame every signed in screen renders inside: a sidebar built from the caller's
 * permission set, a top bar that names where they are, and the routed screen below it.
 *
 * On a phone the sidebar is an off canvas drawer, so the trigger is always rendered and
 * the top bar is sticky. Whichever way down a long list of projects somebody has
 * scrolled, the way back to navigation stays reachable.
 */
export function AppShell() {
  const { pathname } = useLocation();
  const { grants } = useAuth();
  // A failure here narrows the sidebar rather than blocking the app: /me/home is a
  // convenience, and the screens it links to are all reachable by URL anyway.
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
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
