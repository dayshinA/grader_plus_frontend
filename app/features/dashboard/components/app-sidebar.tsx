import { KeyRound, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router";

import { DashboardSidebar } from "~/components/ui/dashboard-sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "~/components/ui/sidebar";
import { useAuth } from "~/features/auth/api/auth-context";
import { findNavItem, visibleNavGroups } from "~/features/dashboard/nav";

/** Initials for the account avatar; falls back to the email when no name came back from login. */
function initials(source: string): string {
  const parts = source.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Brand() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild className="cursor-pointer">
          <Link to="/workspace/dashboard">
            <img
              src="/logo_only_no_text.jpeg"
              alt=""
              aria-hidden="true"
              className="aspect-square size-8 shrink-0 rounded-md object-contain"
            />
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate text-sm font-semibold">GraderPlus</span>
              <span className="truncate text-xs text-muted-foreground">
                Loughborough University
              </span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function AccountMenu() {
  const { user, logout } = useAuth();
  const label = user?.fullName || user?.email || "Signed in";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="cursor-pointer data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div
                aria-hidden="true"
                className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
              >
                {initials(label)}
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">{label}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user?.email ?? "Academic staff"}
                </span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
          >
            <DropdownMenuLabel className="font-normal">
              <span className="block truncate text-sm font-medium">{label}</span>
              <span className="block truncate text-xs text-muted-foreground">{user?.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link to="/change-password">
                <KeyRound aria-hidden="true" />
                Change password
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer"
              onSelect={() => logout()}
            >
              <LogOut aria-hidden="true" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

/**
 * The app's sidebar: the shared `DashboardSidebar` primitive driven by the real, permission-
 * filtered route map, with product branding in place of its workspace switcher and the account
 * menu in place of its bottom items.
 *
 * Active state comes from the URL rather than local state, so a hard refresh, a back button and a
 * ⌘K jump all highlight the same entry the address bar says you're on.
 */
export function AppSidebar() {
  const { pathname } = useLocation();
  const { permissions } = useAuth();
  const active = findNavItem(pathname);

  return (
    <DashboardSidebar
      navGroups={visibleNavGroups(permissions)}
      bottomItems={[]}
      activeId={active?.id ?? ""}
      header={<Brand />}
      footer={<AccountMenu />}
      searchPlaceholder="Jump to a screen…"
    />
  );
}
