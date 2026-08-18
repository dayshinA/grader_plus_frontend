import {
  Building2,
  ClipboardList,
  FileSpreadsheet,
  GaugeCircle,
  GraduationCap,
  Home,
  Layers,
  type LucideIcon,
  PenLine,
  ScrollText,
  Scale,
  ShieldCheck,
  Users,
} from "lucide-react";

import type { Permission, ResolvedGrant } from "~/features/access/types";
import { can, isSystemWide } from "~/features/access/permissions";
import { AUDIT_HIDDEN } from "~/features/audit/visibility";
import type { HomeSummary } from "~/features/dashboard/types";

/**
 * One nav entry, one screen. The sidebar, the breadcrumb and the command palette all read
 * this, so a screen added here appears in all three and cannot drift between them.
 *
 * Navigation is built from `GET /me/permissions` and never from a role name. Somebody
 * holding coordinator on one offering and marker on another gets both sections, which is
 * the normal case rather than an edge case.
 */
export interface NavItem {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
  /** One line on what the screen is for, shown under the page title. */
  description: string;
}

export interface NavGroup {
  heading?: string;
  items: NavItem[];
}

/** Every screen in the app, keyed so a route module can name its own header. */
export const NAV: Record<string, NavItem> = {
  home: {
    id: "home",
    title: "Home",
    href: "/",
    icon: Home,
    description: "What is waiting on you, across every role you hold.",
  },
  marking: {
    id: "marking",
    title: "My marking",
    href: "/marking",
    icon: PenLine,
    description: "The projects you were given, and how far you have got with each.",
  },
  notifications: {
    id: "notifications",
    title: "Notifications",
    href: "/account/notifications",
    icon: ScrollText,
    description: "Assignments, deadlines and outcomes, newest first.",
  },
  account: {
    id: "account",
    title: "Account",
    href: "/account",
    icon: Users,
    description: "Your name, your password and the roles you currently hold.",
  },
  adminUnits: {
    id: "admin-units",
    title: "Academic units",
    href: "/admin/units",
    icon: Building2,
    description: "Schools and the constituent units beneath them. Two levels, and no deeper.",
  },
  adminProgrammes: {
    id: "admin-programmes",
    title: "Programmes",
    href: "/admin/programmes",
    icon: GraduationCap,
    description: "Degree programmes, and the modules linked to each.",
  },
  adminModules: {
    id: "admin-modules",
    title: "Modules",
    href: "/admin/modules",
    icon: Layers,
    description: "Project modules, their offerings, and the programmes they serve.",
  },
  adminUsers: {
    id: "admin-users",
    title: "Accounts",
    href: "/admin/users",
    icon: Users,
    description: "Staff accounts and the roles they hold. Deactivated, never deleted.",
  },
  adminAudit: {
    id: "admin-audit",
    title: "Audit log",
    href: "/admin/audit",
    icon: ShieldCheck,
    description: "Every recorded action, append only. There is nothing here to edit.",
  },
};

/** The offering surface, which is per offering rather than a fixed set of destinations. */
export interface OfferingNavItem {
  id: string;
  title: string;
  /** Appended to /offerings/:id. The index route selects a default from lifecycle status. */
  segment: string;
  icon: LucideIcon;
  description: string;
  permission: Permission;
}

/** Audit is hidden for now, so its tab is filtered out rather than deleted from the list. */
const isVisibleTab = (item: { id: string }) => !AUDIT_HIDDEN || !item.id.endsWith("-audit");

export const OFFERING_NAV: OfferingNavItem[] = ([
  {
    id: "offering-settings",
    title: "Settings",
    segment: "settings",
    icon: GaugeCircle,
    description: "Deadline, discrepancy threshold, and closing the offering.",
    permission: "offering.read",
  },
  {
    id: "offering-intake",
    title: "Intake",
    segment: "intake",
    icon: ClipboardList,
    description: "Upload the Learn archive, then work through what did not parse.",
    permission: "project.read",
  },
  {
    id: "offering-rubric",
    title: "Rubric",
    segment: "rubric",
    icon: ScrollText,
    description: "The criteria markers score against. Weightings total 100.",
    permission: "rubric.read",
  },
  {
    id: "offering-assignments",
    title: "Assignments",
    segment: "assignments",
    icon: Users,
    description: "Who marks what. Two markers minimum, five maximum.",
    permission: "assignment.read",
  },
  {
    id: "offering-dashboard",
    title: "Progress",
    segment: "dashboard",
    icon: GaugeCircle,
    description: "Per project, per marker: not started, in draft, or submitted.",
    permission: "dashboard.read",
  },
  {
    id: "offering-discrepancies",
    title: "Discrepancies",
    segment: "discrepancies",
    icon: Scale,
    description: "Where two markers disagreed by more than the threshold.",
    permission: "discrepancy.read",
  },
  {
    id: "offering-grades",
    title: "Grades",
    segment: "grades",
    icon: Scale,
    description: "Final grades, and the exceptional override path.",
    permission: "grade.read",
  },
  {
    id: "offering-export",
    title: "Export",
    segment: "export",
    icon: FileSpreadsheet,
    description: "The preview names every gap before anything leaves the system.",
    permission: "export.run",
  },
  {
    id: "offering-audit",
    title: "Audit",
    segment: "audit",
    icon: ShieldCheck,
    description: "What happened on this offering, append only.",
    permission: "audit.read_scoped",
  },
] satisfies OfferingNavItem[]).filter(isVisibleTab);

/** The unit surface, likewise per unit. */
export interface UnitNavItem {
  id: string;
  title: string;
  segment: string;
  icon: LucideIcon;
  description: string;
  permission: Permission;
}

export const UNIT_NAV: UnitNavItem[] = ([
  {
    id: "unit-dashboard",
    title: "Progress",
    segment: "dashboard",
    icon: GaugeCircle,
    description: "How far marking has got across every offering beneath this unit.",
    permission: "dashboard.read",
  },
  {
    id: "unit-programmes",
    title: "Programmes",
    segment: "programmes",
    icon: GraduationCap,
    description: "Programmes this unit runs.",
    permission: "programme.read",
  },
  {
    id: "unit-modules",
    title: "Modules",
    segment: "modules",
    icon: Layers,
    description: "Project modules this unit owns, and their offerings.",
    permission: "module.read",
  },
  {
    id: "unit-audit",
    title: "Audit",
    segment: "audit",
    icon: ShieldCheck,
    description: "What happened inside this unit, append only.",
    permission: "audit.read_scoped",
  },
] satisfies UnitNavItem[]).filter(isVisibleTab);

/**
 * The sidebar for this caller. The offering and unit entries come from `GET /me/home`,
 * which already knows which ones they hold. A caller with one useful work surface goes
 * straight to it, so Home is not another stop above the work it would only repeat.
 */
export function buildNavGroups(grants: ResolvedGrant[], home: HomeSummary | undefined): NavGroup[] {
  const groups: NavGroup[] = [];

  if (!singleSurfaceLandingPath(grants, home)) {
    groups.push({ items: [NAV.home] });
  }

  const marking: NavItem[] = [];
  if (can(grants, "marking.work")) {
    marking.push(NAV.marking);
  }
  if (marking.length > 0) {
    groups.push({ heading: "Marking", items: marking });
  }

  // One entry per offering they coordinate, because the surface is offering scoped and a
  // generic "Offerings" link would have nothing to point at.
  const coordinated = sortedCoordinatedOfferings(home);
  if (coordinated.length > 0) {
    groups.push({
      heading: coordinated.length === 1 ? "My offering" : "My offerings",
      items: coordinated.slice(0, 8).map((offering) => ({
        id: `offering-${offering.offeringId}`,
        title: `${offering.moduleCode} ${offering.academicYear}`,
        href: `/offerings/${offering.offeringId}`,
        icon: ClipboardList,
        description: offering.moduleTitle,
      })),
    });
  }

  const administered = sortedAdministeredUnits(home);
  if (administered.length > 0) {
    groups.push({
      heading: administered.length === 1 ? "My unit" : "My units",
      items: administered.slice(0, 8).map((unit) => ({
        id: `unit-${unit.unitId}`,
        title: unit.name,
        href: `/units/${unit.unitId}/dashboard`,
        icon: Building2,
        description: "Programmes, modules and marking progress beneath this unit.",
      })),
    });
  }

  const administration: NavItem[] = [];
  if (can(grants, "unit.read") && isSystemWide(grants)) {
    administration.push(NAV.adminUnits, NAV.adminProgrammes, NAV.adminModules);
  }
  if (can(grants, "user.read")) {
    administration.push(NAV.adminUsers);
  }
  if (!AUDIT_HIDDEN && can(grants, "audit.read")) {
    administration.push(NAV.adminAudit);
  }
  if (administration.length > 0) {
    groups.push({ heading: "Administration", items: administration });
  }

  groups.push({ heading: "You", items: [NAV.notifications, NAV.account] });

  return groups;
}

function sortedAdministeredUnits(home: HomeSummary | undefined): HomeSummary["administers"] {
  return [...(home?.administers ?? [])].sort(
    (a, b) => a.name.localeCompare(b.name) || a.unitId.localeCompare(b.unitId),
  );
}

function sortedCoordinatedOfferings(home: HomeSummary | undefined): HomeSummary["coordinates"] {
  return [...(home?.coordinates ?? [])].sort(
    (a, b) =>
      b.academicYear.localeCompare(a.academicYear, undefined, { numeric: true }) ||
      a.moduleCode.localeCompare(b.moduleCode, undefined, { numeric: true, sensitivity: "base" }) ||
      a.moduleTitle.localeCompare(b.moduleTitle, undefined, { sensitivity: "base" }) ||
      a.offeringId.localeCompare(b.offeringId),
  );
}

/**
 * Home combines work across surfaces. If the caller has exactly one kind of work,
 * `/` routes straight through to marking or the first available scoped entry point.
 * This is deliberately capability and entry-point driven, never a branch on a role name.
 */
export function singleSurfaceLandingPath(
  grants: ResolvedGrant[],
  home: HomeSummary | undefined,
): string | null {
  if (!home || grants.length === 0 || home.isSystemAdmin) {
    return null;
  }

  const coordinated = sortedCoordinatedOfferings(home);
  const administered = sortedAdministeredUnits(home);
  const hasMarking = can(grants, "marking.work");
  const surfaceCount =
    Number(hasMarking) + Number(coordinated.length > 0) + Number(administered.length > 0);

  if (surfaceCount !== 1) {
    return null;
  }

  if (hasMarking) {
    return NAV.marking.href;
  }

  if (coordinated.length > 0) {
    return `/offerings/${coordinated[0].offeringId}`;
  }

  if (administered.length > 0) {
    return `/units/${administered[0].unitId}/dashboard`;
  }

  return null;
}

/** The nav entry a URL belongs to, matched by longest prefix so detail screens highlight. */
export function findNavItem(groups: NavGroup[], pathname: string): NavItem | undefined {
  return groups
    .flatMap((group) => group.items)
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export function findNavGroupHeading(groups: NavGroup[], item: NavItem): string | undefined {
  return groups.find((group) => group.items.includes(item))?.heading;
}
