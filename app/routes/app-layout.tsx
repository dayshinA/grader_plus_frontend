import {
  Building2,
  ClipboardCheck,
  FileClock,
  FileSpreadsheet,
  LayoutDashboard,
  ListChecks,
  LogOut,
  ScrollText,
  Settings,
  ShieldCheck,
  Upload,
  UserCog,
  Users,
} from "lucide-react";
import { useState, type CSSProperties } from "react";
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
      {
        label: "Module Settings",
        href: "/coordinator/module-settings",
        icon: Settings,
        end: true,
      },
      {
        label: "Submissions",
        href: "/coordinator/submissions",
        icon: Upload,
        end: true,
      },
      {
        label: "Marker Assignments",
        href: "/coordinator/marker-assignments",
        icon: ListChecks,
        end: true,
      },
      {
        label: "Rubrics",
        href: "/coordinator/rubrics",
        icon: ScrollText,
        end: true,
      },
      {
        label: "Discrepancies",
        href: "/coordinator/discrepancies",
        icon: ClipboardCheck,
        end: true,
      },
      {
        label: "Export",
        href: "/coordinator/export",
        icon: FileSpreadsheet,
        end: true,
      },
    ],
  ],
  marker: [
    [{ label: "My Projects", href: "/marker/projects", icon: FileClock, end: true }],
  ],
  super_admin: [
    [
      { label: "Users", href: "/super-admin/users", icon: Users, end: true },
      {
        label: "Departments",
        href: "/super-admin/departments",
        icon: Building2,
        end: true,
      },
      {
        label: "Department Admin Grants",
        href: "/super-admin/department-admin-grants",
        icon: ShieldCheck,
        end: true,
      },
      {
        label: "Module Grants",
        href: "/super-admin/module-grants",
        icon: UserCog,
        end: true,
      },
    ],
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
        <div className="flex items-center gap-2 border-b border-border p-3 md:hidden">
          <SidebarTrigger />
          <span className="text-sm font-semibold text-primary">GraderPlus</span>
        </div>

        <Sidebar
          groups={navGroupsByRole[user.role]}
          onCollapsedChange={setIsCollapsed}
          logo={(isCollapsedNow) =>
            isCollapsedNow ? (
              <SidebarTrigger />
            ) : (
              <div className="flex w-full items-center gap-2">
                <img
                  src="/logo_only_no_text.jpeg"
                  alt="Loughborough University"
                  className="h-5 w-5 shrink-0 rounded-sm"
                />
                <span className="flex-1 truncate text-sm font-semibold text-primary">GraderPlus</span>
                <SidebarTrigger />
              </div>
            )
          }
          footer={(isCollapsedNow) => (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger className="w-full">
                <div className="flex h-8 w-full flex-row items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-accent hover:text-accent-foreground">
                  <Avatar className="size-6 shrink-0">
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
          className="p-4 sm:p-6 md:pl-(--content-offset)"
          style={{
            "--content-offset": `calc(${isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH} + 1.5rem)`,
            transition: "padding-left 200ms ease-out",
          } as CSSProperties}
        >
          <Outlet />
        </div>
      </div>
    </SidebarProvider>
  );
}
