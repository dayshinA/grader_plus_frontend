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
import { hasPermission, hasRole } from "~/features/permissions/utils";
import type {
  PermissionKey,
  UserPermissionsSummary,
} from "~/features/permissions/types";

/**
 * CH-16 (Phase 4) rebuild. One unified nav definition — no more picking a whole
 * array by the user's most senior role template (the pre-CH-16 stop-gap, and
 * before that the deleted `Record<Role, …>`). Every item declares the
 * permission(s) that make it relevant and `filterByPermissions` below drops
 * whatever the caller's `summary.permissionKeys` doesn't cover, then drops any
 * group left empty. This is what makes a department-scoped Coordinator (who
 * holds nothing but `modules.create`) see Module Settings and nothing else
 * (CH-17), and what gives a School/Department Admin a nav path to `Users` —
 * they hold `users.create` even though `GET /users` (and so `users.view`) is
 * Super-Admin-only, a gap the old role-bucketed nav had no way to expose (see
 * BUGS.md, found while building this).
 *
 * Confirmed with Dayshin (`AskUserQuestion`, 2026-08-01) as a full merge rather
 * than keeping separate role-bucketed arrays: a Super Admin holds every
 * permission in the catalogue (`require-workspace.tsx`/`require-marking.tsx`'s
 * own comments already establish they pass every route guard), so under a true
 * permission-filtered nav they legitimately see the assessment-workspace groups
 * too, alongside the admin-console ones — accepted as correct rather than
 * special-cased away. See SYSTEM_DESIGN.md decision #44.
 *
 * One deliberate exception: `Schools`/`Departments`/`Modules` under
 * "Organisation" stay gated on `hasRole(summary, "super_admin")` in addition to
 * their permission, computed below rather than declared via `requires`. These
 * are the dedicated Super-Admin oversight views (decision #33 built
 * `/super-admin/modules` specifically so Super Admin didn't have to share the
 * Coordinator's own screen) — `departments.create`/`modules.create` are also
 * held by a School Admin/Coordinator respectively, and without this extra
 * identity check every one of them would additionally see a second, redundant
 * "Departments"/"Modules" entry pointing at the Super-Admin oversight route
 * rather than their own scoped screen. This mirrors CH-15's identical
 * identity-vs-capability distinction for the module form's coordinator picker.
 */
function buildNavGroups(
  summary: UserPermissionsSummary | null,
): SidebarGroupInput[] {
  const isSuperAdmin = hasRole(summary, "super_admin");

  const groups: SidebarGroupInput[] = [
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
          requires: "dashboard.view" satisfies PermissionKey,
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
          requires: ["modules.view", "modules.create"] satisfies PermissionKey[],
        },
        {
          // Decision #38 reversed 2026-08-01 (CH-16): the frontend can now tell
          // School Admin apart from a plain Coordinator directly
          // (`/role-assignments/me`), so this no longer needs to stay
          // always-visible-with-an-empty-state — gated on `departments.create`,
          // matching the route's own `PermissionGate` (`school-settings.tsx`).
          label: "School Settings",
          href: "/coordinator/school-settings",
          icon: Landmark,
          end: true,
          requires: "departments.create" satisfies PermissionKey,
        },
        {
          label: "Rubrics",
          href: "/coordinator/rubrics",
          icon: ScrollText,
          end: true,
          requires: "rubrics.manage" satisfies PermissionKey,
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
          requires: "submissions.upload" satisfies PermissionKey,
        },
        {
          label: "Marker Assignments",
          href: "/coordinator/marker-assignments",
          icon: ListChecks,
          end: true,
          requires: "markers.assign" satisfies PermissionKey,
        },
        {
          label: "Discrepancies",
          href: "/coordinator/discrepancies",
          icon: ClipboardCheck,
          end: true,
          requires: "discrepancies.view" satisfies PermissionKey,
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
          requires: "grades.export" satisfies PermissionKey,
        },
      ],
    },
    [
      {
        label: "My Projects",
        href: "/marker/projects",
        icon: FileClock,
        end: true,
        requires: "evaluations.submit" satisfies PermissionKey,
      },
    ],
    {
      // Widened 2026-08-01 (CH-16) from `users.view` alone — a School/Department
      // Admin holds `users.create` but not `users.view` (SYSTEM_DESIGN.md
      // decision #42), so an any-of on both is what actually gets them a nav
      // path here. See the matching route-level fix in
      // `routes/super-admin/users.tsx` and BUGS.md.
      label: "Users",
      collapsible: true,
      defaultOpen: true,
      items: [
        {
          label: "Users",
          href: "/super-admin/users",
          icon: Users,
          end: true,
          requires: ["users.view", "users.create"] satisfies PermissionKey[],
        },
      ],
    },
    {
      // The three "... Grants" items that used to sit alongside Schools,
      // Departments and Modules are gone with CH-06/07/08 — their twelve
      // endpoints no longer exist. All three collapse into the single
      // Delegation entry below (CH-09). Super-Admin-only — see this
      // function's own doc comment for why.
      label: "Organisation",
      collapsible: true,
      defaultOpen: true,
      items: isSuperAdmin
        ? [
            {
              label: "Schools",
              href: "/super-admin/schools",
              icon: Landmark,
              end: true,
              requires: "schools.create" satisfies PermissionKey,
            },
            {
              label: "Departments",
              href: "/super-admin/departments",
              icon: Building2,
              end: true,
              requires: "departments.create" satisfies PermissionKey,
            },
            {
              label: "Modules",
              href: "/super-admin/modules",
              icon: GraduationCap,
              end: true,
              requires: "modules.create" satisfies PermissionKey,
            },
          ]
        : [],
    },
    {
      // Added 2026-07-31 (CH-09), filtered on `roles.assign`: School Admins and
      // Department Admins hold it, and a plain Coordinator or Marker holds
      // neither and never sees it.
      label: "Delegation",
      collapsible: true,
      defaultOpen: true,
      items: [
        {
          label: "Role Assignments",
          href: "/super-admin/role-assignments",
          icon: ShieldCheck,
          end: true,
          requires: "roles.assign" satisfies PermissionKey,
        },
      ],
    },
  ];

  return filterByPermissions(groups, summary);
}

/** Any-of when `requires` is an array, single-key check otherwise. */
function itemIsVisible(
  requires: PermissionKey | PermissionKey[] | undefined,
  summary: UserPermissionsSummary | null,
): boolean {
  if (!requires) return true;
  const keys = Array.isArray(requires) ? requires : [requires];
  return keys.some((key) => hasPermission(summary, key));
}

/** Drops any item whose `requires` permission(s) the user doesn't hold, then any group left with
 * nothing in it. */
function filterByPermissions(
  groups: SidebarGroupInput[],
  summary: UserPermissionsSummary | null,
): SidebarGroupInput[] {
  return groups
    .map((group) => {
      const normalized = Array.isArray(group) ? { items: group } : group;
      const items = normalized.items.filter((item) =>
        itemIsVisible(item.requires as PermissionKey | PermissionKey[] | undefined, summary),
      );
      return Array.isArray(group) ? items : { ...normalized, items };
    })
    .filter((group) => (Array.isArray(group) ? group.length : group.items.length) > 0);
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
          groups={buildNavGroups(permissions)}
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
