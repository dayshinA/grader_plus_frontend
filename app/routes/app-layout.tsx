import {
  Building2,
  ClipboardCheck,
  FileClock,
  FileSpreadsheet,
  GraduationCap,
  Landmark,
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
import { hasRole } from "~/features/permissions/utils";
import type { UserPermissionsSummary } from "~/features/permissions/types";

// TODO(CH-16, Phase 4): this whole block is a deliberate stop-gap. The proper
// rebuild has each nav item declare the permission that makes it relevant, with
// the list filtered from `summary.permissionKeys` — that's the only shape that
// gets a School Admin's nav right without special-casing, and the only one that
// stops a department-scoped Coordinator (who holds `modules.create` and nothing
// else) being shown six items that 403.
//
// It isn't done here because it depends on Phase 2's delegation nav entry and on
// reversing decision #38, neither of which exist yet. Until then these three
// arrays are the pre-RBAC ones, picked by the user's most senior role instead of
// by the deleted `user.role`. Known wrong in two ways for one session:
//   - a department-scoped-only Coordinator sees items they can't use (CH-17), and
//   - the three grant entries below point at routes deleted in Phase 2.
const coordinatorNavGroups: SidebarGroupInput[] = [
    {
      label: "Overview",
      collapsible: true,
      defaultOpen: true,
      items: [
        {
          label: "Dashboard",
          href: "/coordinator/dashboard",
          icon: LayoutDashboard,
          end: true,
        },
      ],
    },
    {
      label: "Setup",
      collapsible: true,
      defaultOpen: true,
      items: [
        {
          label: "Module Settings",
          href: "/coordinator/module-settings",
          icon: Settings,
          end: true,
        },
        {
          // Added 2026-07-29 (FR41-43) — always visible to every Coordinator, with an empty
          // state for non-School-Admins, per decision #38 (matches this app's static-nav
          // convention rather than introducing grant-conditional nav).
          label: "School Settings",
          href: "/coordinator/school-settings",
          icon: Landmark,
          end: true,
        },
        {
          label: "Rubrics",
          href: "/coordinator/rubrics",
          icon: ScrollText,
          end: true,
        },
      ],
    },
    {
      label: "Grading",
      collapsible: true,
      defaultOpen: true,
      items: [
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
          label: "Discrepancies",
          href: "/coordinator/discrepancies",
          icon: ClipboardCheck,
          end: true,
        },
      ],
    },
    {
      label: "Reporting",
      collapsible: true,
      defaultOpen: true,
      items: [
        {
          label: "Export",
          href: "/coordinator/export",
          icon: FileSpreadsheet,
          end: true,
        },
      ],
    },
];

const markerNavGroups: SidebarGroupInput[] = [
  [{ label: "My Projects", href: "/marker/projects", icon: FileClock, end: true }],
];

const adminNavGroups: SidebarGroupInput[] = [
    {
      label: "Users",
      collapsible: true,
      defaultOpen: true,
      items: [{ label: "Users", href: "/super-admin/users", icon: Users, end: true }],
    },
    {
      // Added 2026-07-29 (FR41-43) — new hierarchy level above Departments.
      label: "Schools",
      collapsible: true,
      defaultOpen: true,
      items: [
        {
          label: "Schools",
          href: "/super-admin/schools",
          icon: Landmark,
          end: true,
        },
        {
          label: "School Admin Grants",
          href: "/super-admin/school-admin-grants",
          icon: ShieldCheck,
          end: true,
        },
      ],
    },
    {
      label: "Departments",
      collapsible: true,
      defaultOpen: true,
      items: [
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
      ],
    },
    {
      label: "Modules",
      collapsible: true,
      defaultOpen: true,
      items: [
        {
          label: "Modules",
          href: "/super-admin/modules",
          icon: GraduationCap,
          end: true,
        },
        {
          label: "Module Grants",
          href: "/super-admin/module-grants",
          icon: UserCog,
          end: true,
        },
      ],
    },
];

/**
 * Picks a nav group array by the user's most senior role template, using the
 * same seniority order as `landingPath`. Stop-gap — see the TODO(CH-16) above.
 *
 * Note this shows a School Admin and a Department Admin the coordinator nav,
 * which is correct: they work out of the assessment screens for their whole
 * scope (decision #39).
 */
function navGroupsFor(
  summary: UserPermissionsSummary | null,
): SidebarGroupInput[] {
  if (hasRole(summary, "super_admin")) return adminNavGroups;
  if (
    hasRole(summary, "school_admin") ||
    hasRole(summary, "department_admin") ||
    hasRole(summary, "project_coordinator")
  ) {
    return coordinatorNavGroups;
  }
  if (hasRole(summary, "marker")) return markerNavGroups;
  // No assignments, or a template this build doesn't know. ProtectedRoute and
  // landingPath already route these users to /unauthorized, so this layout
  // shouldn't render for them at all — an empty nav is the safe fallback.
  return [];
}

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function AppLayout() {
  const { user, permissions, logout } = useAuth();
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
          groups={navGroupsFor(permissions)}
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
