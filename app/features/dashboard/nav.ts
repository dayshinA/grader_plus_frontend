import {
  Building2,
  ClipboardCheck,
  FileClock,
  FileSpreadsheet,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  ListChecks,
  type LucideIcon,
  ScrollText,
  Settings,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";

import type {
  PermissionKey,
  UserPermissionsSummary,
} from "~/features/permissions/types";
import { hasPermission, hasRole } from "~/features/permissions/utils";

/**
 * One nav entry = one screen. This is the single source of truth for the sidebar, the breadcrumb
 * in the top bar, the ⌘K palette and each screen's page header — a screen added here shows up in
 * all four and can't drift between them.
 */
export interface AppNavItem {
  /** Stable id, also the sidebar's active key. */
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
  /** One line on what the screen is for. Shown under the page title. */
  description: string;
  /**
   * The permission(s) that make this screen relevant. An array is an any-of: a School/Department
   * Admin holds `users.create` but not `users.view`, and either one earns them the Users entry.
   * Omitted means "always visible to a signed-in user".
   */
  requires?: PermissionKey | PermissionKey[];
  /**
   * Hidden from anyone holding any of these — the inverse of `requires`, for a pair of screens
   * that render the same data at different altitudes. `Modules` (read-only oversight) and
   * `Module Settings` (manage your own) are one such pair: whether a viewer gets the oversight
   * entry or the management entry is decided by whether they can *write* modules, so the
   * oversight entry excludes the three module write permissions and the management entry
   * requires them. Nobody ever sees both (2026-08-10, generalising decision #47, which solved
   * the same duplication for System Administrator alone with `exceptSuperAdmin`).
   */
  excludes?: PermissionKey | PermissionKey[];
  /**
   * Additionally restricted to System Administrator. Used only by the Organisation group, whose
   * screens are the dedicated Super-Admin oversight views — every other role reaches the same
   * data through its own scoped screen and would otherwise see two entries for one thing.
   */
  superAdminOnly?: boolean;
  /** Hidden from System Administrator: it has a dedicated oversight screen for this instead. */
  exceptSuperAdmin?: boolean;
}

export interface AppNavGroup {
  heading?: string;
  items: AppNavItem[];
}

/**
 * Admin-console groups (Users, Organisation, Delegation) lead, ahead of the academic-workspace
 * groups (Overview, Setup, Grading, Reporting, My Projects) — one shared, permission-filtered
 * order for every role rather than a role-specific branch.
 */
export const appNavGroups: AppNavGroup[] = [
  {
    items: [
      {
        id: "dashboard",
        title: "Dashboard",
        href: "/workspace/dashboard",
        icon: LayoutDashboard,
        description:
          "Marking progress across your modules — who has submitted, who is still outstanding.",
        requires: "dashboard.view",
      },
    ],
  },
  {
    heading: "People",
    items: [
      {
        id: "users",
        title: "Users",
        href: "/super-admin/users",
        icon: Users,
        description: "Staff accounts on the platform, and the roles each of them holds.",
        requires: ["users.view", "users.create"],
      },
      {
        id: "role-assignments",
        title: "Role Assignments",
        href: "/super-admin/role-assignments",
        icon: ShieldCheck,
        description:
          "Who holds which role, at which scope — and the extra permissions granted on top.",
        requires: "roles.assign",
      },
    ],
  },
  {
    heading: "Organisation",
    items: [
      {
        id: "schools",
        title: "Schools",
        href: "/super-admin/schools",
        icon: Landmark,
        description: "Every school on the platform, and the admins responsible for each.",
        requires: "schools.create",
        superAdminOnly: true,
      },
      {
        id: "departments",
        title: "Departments",
        href: "/super-admin/departments",
        icon: Building2,
        description: "Departments across all schools, and their department admins.",
        requires: "departments.create",
        superAdminOnly: true,
      },
      {
        id: "modules",
        title: "Modules",
        href: "/super-admin/modules",
        icon: GraduationCap,
        description: "Read-only oversight of academic modules and their coordinators.",
        // Anyone who can only *look* at modules: System Administrator (platform-wide) and
        // School Admin (their school). Both lost the module lifecycle in the backend's
        // 2026-08-03 least-privilege redesign — it belongs to Department Admin and
        // Coordinator now — so neither belongs on the management screen below.
        requires: "modules.view",
        excludes: ["modules.create", "modules.update", "modules.deactivate"],
      },
    ],
  },
  {
    heading: "Setup",
    items: [
      {
        id: "module-settings",
        title: "Module Settings",
        href: "/workspace/module-settings",
        icon: Settings,
        description: "The modules you coordinate — create one, or change its details.",
        // The write half of the pair above. `modules.create` alone is what a department-scoped
        // Coordinator holds (no `modules.view` — CH-17), `modules.update`/`deactivate` what a
        // module-scoped one and a Department Admin hold. A read-only viewer gets `Modules`
        // instead, so `exceptSuperAdmin` is no longer needed here: System Administrator is
        // excluded by the same rule that excludes School Admin, on capability rather than name.
        requires: ["modules.create", "modules.update", "modules.deactivate"],
      },
      {
        id: "school-settings",
        title: "School Settings",
        href: "/workspace/school-settings",
        icon: Landmark,
        description: "Your school's departments, and the admins who run them.",
        requires: "departments.create",
        exceptSuperAdmin: true,
      },
      {
        id: "rubrics",
        title: "Rubrics",
        href: "/workspace/rubrics",
        icon: ScrollText,
        description: "The criteria markers score against, and the weight carried by each.",
        // Any-of, corrected 2026-08-10: `rubrics.create` alone hid the screen from every
        // read-only holder. Department Admin and System Administrator hold `rubrics.view` and
        // nothing else here (authoring is the module Coordinator's alone since the 2026-08-03
        // least-privilege redesign), so gating on the write key locked them out of a screen the
        // backend serves them. School Admin holds neither, by design, and still sees nothing.
        requires: ["rubrics.view", "rubrics.create"],
      },
    ],
  },
  {
    heading: "Grading",
    items: [
      {
        id: "submissions",
        title: "Submissions",
        href: "/workspace/submissions",
        icon: Upload,
        description: "Student work pulled in from Learn, ready to be marked.",
        requires: "submissions.upload",
      },
      {
        id: "marker-assignments",
        title: "Marker Assignments",
        href: "/workspace/marker-assignments",
        icon: ListChecks,
        description: "Which markers see which projects. Up to five markers per project.",
        requires: "markers.assign",
      },
      {
        id: "discrepancies",
        title: "Discrepancies",
        href: "/workspace/discrepancies",
        icon: ClipboardCheck,
        description: "Projects where markers disagreed by more than the module's threshold.",
        requires: "discrepancies.view",
      },
    ],
  },
  {
    heading: "Reporting",
    items: [
      {
        id: "grades",
        title: "Grades",
        href: "/workspace/grades",
        icon: FileSpreadsheet,
        description: "Confirmed final grades, and how each one was arrived at.",
        // Replaced the `export` entry on 2026-08-10. Any-of over the two keys that read the same
        // `final_grades` data: `grades.view` (School/Department Admin, System Administrator, and
        // the module's Coordinator) and `grades.export` (that Coordinator alone, for the
        // Learn-format CSV). One screen, download gated inside it — so unlike the Modules pair
        // below, no `excludes` is wanted here: the Coordinator holds both and needs the entry.
        requires: ["grades.view", "grades.export"],
      },
    ],
  },
  {
    items: [
      {
        id: "my-projects",
        title: "My Projects",
        href: "/marker/projects",
        icon: FileClock,
        description: "The projects assigned to you to mark, graded blind.",
        requires: "evaluations.submit",
      },
    ],
  },
];

/** Flat list, in sidebar order. */
export const appNavItems: AppNavItem[] = appNavGroups.flatMap((group) => group.items);

/** Any-of when `requires` is an array, single-key check otherwise. */
function itemIsVisible(
  item: AppNavItem,
  summary: UserPermissionsSummary | null,
): boolean {
  const isSuperAdmin = hasRole(summary, "system_administrator");
  if (item.superAdminOnly && !isSuperAdmin) return false;
  if (item.exceptSuperAdmin && isSuperAdmin) return false;
  if (item.excludes) {
    const excluded = Array.isArray(item.excludes) ? item.excludes : [item.excludes];
    if (excluded.some((key) => hasPermission(summary, key))) return false;
  }
  if (!item.requires) return true;
  const keys = Array.isArray(item.requires) ? item.requires : [item.requires];
  return keys.some((key) => hasPermission(summary, key));
}

/** Drops every item the user's permissions don't cover, then any group left with nothing in it. */
export function visibleNavGroups(
  summary: UserPermissionsSummary | null,
): AppNavGroup[] {
  return appNavGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => itemIsVisible(item, summary)) }))
    .filter((group) => group.items.length > 0);
}

/**
 * The nav entry a URL belongs to. Matched by longest prefix so detail screens nested under a
 * section (`/super-admin/users/4`) still resolve to — and highlight — that section.
 */
export function findNavItem(pathname: string): AppNavItem | undefined {
  return appNavItems
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

/** The group heading a nav entry sits under, for the breadcrumb's first crumb. */
export function findNavGroupHeading(item: AppNavItem): string | undefined {
  return appNavGroups.find((group) => group.items.includes(item))?.heading;
}
