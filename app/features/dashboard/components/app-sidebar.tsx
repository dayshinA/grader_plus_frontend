import { Bell, KeyRound, LogOut, UserRound } from "lucide-react";
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
import { useLogout } from "~/features/auth/api/use-auth";
import { findNavItem, type NavGroup } from "~/features/dashboard/nav";
import { useNotifications } from "~/features/notifications/api/use-notifications";
import { backTo } from "~/hooks/use-back-link";

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
          <Link to="/">
            {/* The crest carries its own purple ground, so it sits on nothing rather than
                on a primary tile. The text beside it names both, so this is decorative. */}
            <img
              src="/logo_only_no_text.jpeg"
              alt=""
              aria-hidden="true"
              className="aspect-square size-8 shrink-0 rounded-md object-cover"
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
  const { user, session } = useAuth();
  const logout = useLogout();
  const { data: unread } = useNotifications(true);

  const name = user?.fullName || session?.fullName || "Signed in";
  const email = user?.email ?? session?.email ?? "";
  const unreadCount = unread?.length ?? 0;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="cursor-pointer data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <span
                aria-hidden="true"
                className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
              >
                {initials(name)}
              </span>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">{name}</span>
                <span className="truncate text-xs text-muted-foreground">{email}</span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
          >
            <DropdownMenuLabel className="font-normal">
              <span className="block truncate text-sm font-medium">{name}</span>
              <span className="block truncate text-xs text-muted-foreground">{email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link to="/account">
                <UserRound aria-hidden="true" />
                Account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link to="/account/notifications">
                <Bell aria-hidden="true" />
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            </DropdownMenuItem>
            {/* The password screen is a sub-screen of Account, so this menu declares that
                parent as the way back rather than leaving the screen with none. */}
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link to="/account/password" state={backTo({ to: "/account", label: "account" })}>
                <KeyRound aria-hidden="true" />
                Change password
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer"
              disabled={logout.isPending}
              onSelect={(event) => {
                // Keep the menu mounted while the request is in flight, so the disabled
                // state is what a slow network shows rather than a vanished menu.
                event.preventDefault();
                logout.mutate();
              }}
            >
              <LogOut aria-hidden="true" />
              {logout.isPending ? "Signing out" : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

/**
 * Active state comes from the URL rather than local state, so a hard refresh, the back
 * button and a command palette jump all highlight the entry the address bar says you are
 * on.
 */
export function AppSidebar({ navGroups }: { navGroups: NavGroup[] }) {
  const { pathname } = useLocation();
  const active = findNavItem(navGroups, pathname);
  const { data: unread } = useNotifications(true);
  const unreadCount = unread?.length ?? 0;

  const groups = navGroups.map((group) => ({
    heading: group.heading,
    items: group.items.map((item) => ({
      id: item.id,
      title: item.title,
      href: item.href,
      icon: item.icon,
      badge:
        item.id === "notifications" && unreadCount > 0
          ? unreadCount > 99
            ? "99+"
            : unreadCount
          : undefined,
    })),
  }));

  return (
    <DashboardSidebar
      navGroups={groups}
      bottomItems={[]}
      activeId={active?.id ?? ""}
      header={<Brand />}
      footer={<AccountMenu />}
      searchPlaceholder="Jump to a screen"
    />
  );
}
