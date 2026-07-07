import {
  FileClock,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Outlet } from "react-router";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_EXPANDED_WIDTH,
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
  type SidebarGroupInput,
} from "~/components/ui/sidebar";
import { useAuth } from "~/features/auth/api/auth-context";
import type { Role } from "~/features/auth/types";

const navGroupsByRole: Record<Role, SidebarGroupInput[]> = {
  coordinator: [
    [
      {
        label: "Dashboard",
        href: "/coordinator/dashboard",
        icon: LayoutDashboard,
        end: true,
      },
    ],
  ],
  marker: [
    [{ label: "My Projects", href: "/marker/projects", icon: FileClock, end: true }],
  ],
  super_admin: [
    [{ label: "Users", href: "/super-admin/users", icon: Users, end: true }],
  ],
};

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(true);

  if (!user) {
    // ProtectedRoute (an ancestor route) guarantees a user exists before this
    // layout renders — this satisfies the type narrowing below.
    return null;
  }

  return (
    <SidebarProvider defaultCollapsed>
      <div className="min-h-screen bg-background text-foreground">
        <div
          className="flex items-center gap-2 border-b border-border p-3"
          style={{
            paddingLeft: `calc(${isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH} + 0.75rem)`,
            transition: "padding-left 200ms ease-out",
          }}
        >
          <SidebarTrigger />
          <span className="text-sm font-semibold md:hidden">GraderPlus</span>
        </div>

        <Sidebar
          groups={navGroupsByRole[user.role]}
          onCollapsedChange={setIsCollapsed}
          logo={(isCollapsedNow) => (
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 shrink-0 text-primary" />
              {!isCollapsedNow && (
                <span className="text-sm font-semibold">GraderPlus</span>
              )}
            </div>
          )}
          footer={(isCollapsedNow) => (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger className="w-full">
                <div className="flex h-8 w-full flex-row items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-accent hover:text-accent-foreground">
                  <Avatar className="size-6">
                    <AvatarFallback>{initials(user.fullName)}</AvatarFallback>
                  </Avatar>
                  {!isCollapsedNow && (
                    <span className="truncate text-sm font-medium">
                      {user.fullName}
                    </span>
                  )}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent sideOffset={5}>
                <DropdownMenuItem onSelect={logout}>
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />

        <div
          className="p-4 sm:p-6"
          style={{
            paddingLeft: `calc(${isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH} + 1.5rem)`,
            transition: "padding-left 200ms ease-out",
          }}
        >
          <Outlet />
        </div>
      </div>
    </SidebarProvider>
  );
}
