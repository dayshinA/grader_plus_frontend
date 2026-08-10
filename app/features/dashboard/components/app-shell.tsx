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
import { AppSidebar } from "~/features/dashboard/components/app-sidebar";
import { findNavGroupHeading, findNavItem } from "~/features/dashboard/nav";

/**
 * The frame every signed-in screen renders inside: persistent sidebar, a top bar that names where
 * you are, and the routed screen below it.
 *
 * On a phone the sidebar is an off-canvas drawer (the `Sidebar` primitive handles that at its own
 * breakpoint), which is why the trigger is always rendered and the top bar is sticky — the way
 * back to navigation must stay reachable however far down a long list of students you've
 * scrolled.
 */
export function AppShell() {
  const { pathname } = useLocation();
  const active = findNavItem(pathname);
  const groupHeading = active ? findNavGroupHeading(active) : undefined;
  // Screens outside the sidebar's map (e.g. /change-password) still get a sensible crumb.
  const pageTitle = active?.title ?? "Account";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border/50 bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
          <SidebarTrigger className="-ml-1 size-9 cursor-pointer sm:size-8" />
          <Separator orientation="vertical" className="h-4" />
          <Breadcrumb>
            <BreadcrumbList className="flex-nowrap">
              {groupHeading && (
                <>
                  {/* Context, not a destination — group headings have no screen of their own. */}
                  <BreadcrumbItem className="hidden sm:block">
                    <BreadcrumbPage className="text-muted-foreground">{groupHeading}</BreadcrumbPage>
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
