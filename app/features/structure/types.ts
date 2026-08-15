// Mirrors src/structure. Two levels of academic unit, then programmes and modules as
// siblings, then one offering per module per academic year.

export const ACADEMIC_UNIT_LEVELS = ["school", "constituent_unit"] as const;
export type AcademicUnitLevel = (typeof ACADEMIC_UNIT_LEVELS)[number];

export const ACADEMIC_UNIT_LEVEL_LABELS: Record<AcademicUnitLevel, string> = {
  school: "School",
  constituent_unit: "Constituent unit",
};

/** Descriptive only. Nothing branches on it, and a guard that did would be a bug. */
export const ACADEMIC_UNIT_KINDS = [
  "school",
  "department",
  "institute",
  "academic_area",
  "other",
] as const;
export type AcademicUnitKind = (typeof ACADEMIC_UNIT_KINDS)[number];

export const ACADEMIC_UNIT_KIND_LABELS: Record<AcademicUnitKind, string> = {
  school: "School",
  department: "Department",
  institute: "Institute",
  academic_area: "Academic area",
  other: "Other",
};

export interface AcademicUnit {
  id: string;
  name: string;
  code: string | null;
  level: AcademicUnitLevel;
  unitKind: AcademicUnitKind;
  parentUnitId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUnitPayload {
  name: string;
  code?: string;
  level: AcademicUnitLevel;
  unitKind: AcademicUnitKind;
  /** Required for a constituent unit, and must be a school. */
  parentUnitId?: string;
}

export interface UpdateUnitPayload {
  name?: string;
  code?: string;
  level?: AcademicUnitLevel;
  unitKind?: AcademicUnitKind;
  /** null promotes a constituent unit to a school. */
  parentUnitId?: string | null;
  isActive?: boolean;
}

export const PROGRAMME_LEVELS = [
  "undergraduate",
  "postgraduate_taught",
  "postgraduate_research",
] as const;
export type ProgrammeLevel = (typeof PROGRAMME_LEVELS)[number];

export const PROGRAMME_LEVEL_LABELS: Record<ProgrammeLevel, string> = {
  undergraduate: "Undergraduate",
  postgraduate_taught: "Postgraduate taught",
  postgraduate_research: "Postgraduate research",
};

export interface Programme {
  id: string;
  administrativeUnitId: string;
  code: string;
  title: string;
  level: ProgrammeLevel;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProgrammePayload {
  code: string;
  title: string;
  level: ProgrammeLevel;
}

export interface UpdateProgrammePayload {
  code?: string;
  title?: string;
  level?: ProgrammeLevel;
  isActive?: boolean;
}

/** `project_modules` on the backend. A module is permanent; an offering is one year of it. */
export interface ProjectModule {
  id: string;
  administrativeUnitId: string;
  code: string;
  title: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateModulePayload {
  code: string;
  title: string;
}

export interface UpdateModulePayload {
  code?: string;
  title?: string;
  isActive?: boolean;
}

/** A row of `GET /modules/:id/programmes`. The link carries nothing but the pair. */
export interface ModuleProgrammeLink {
  moduleId: string;
  programmeId: string;
  createdAt: string;
}

export const OFFERING_STATUSES = ["setup", "marking", "moderation", "closed"] as const;
export type OfferingStatus = (typeof OFFERING_STATUSES)[number];

export const OFFERING_STATUS_LABELS: Record<OfferingStatus, string> = {
  setup: "Setup",
  marking: "Marking",
  moderation: "Moderation",
  closed: "Closed",
};

export interface ModuleOffering {
  id: string;
  moduleId: string;
  academicYear: string;
  markingDeadline: string | null;
  discrepancyThreshold: number;
  /** Fixed at creation. There is no route that changes it afterwards. */
  maxMarkersPerProject: number;
  status: OfferingStatus;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOfferingPayload {
  /** Looks like 2025/26. */
  academicYear: string;
  markingDeadline?: string;
  discrepancyThreshold?: number;
  maxMarkersPerProject?: number;
}

export interface UpdateOfferingPayload {
  markingDeadline?: string;
  discrepancyThreshold?: number;
}
