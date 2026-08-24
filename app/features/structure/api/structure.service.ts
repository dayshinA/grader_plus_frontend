import { api, apiWithMessage } from "~/lib/api-client";
import type { ApiResult } from "~/lib/api-client";
import type { ImportReport } from "~/types/import-report";
import type {
  AcademicUnit,
  CreateModulePayload,
  CreateOfferingPayload,
  CreateProgrammePayload,
  CreateUnitPayload,
  ModuleOffering,
  ModuleProgrammeLink,
  Programme,
  ProjectModule,
  UpdateModulePayload,
  UpdateOfferingPayload,
  UpdateProgrammePayload,
  UpdateUnitPayload,
} from "~/features/structure/types";

// Units, programmes and modules, then offerings. Every list returns its full set, unpaged.
export const structureService = {
  /** Narrowed server side to the caller's grants. A 403 means out of scope. */
  listUnits(): Promise<AcademicUnit[]> {
    return api.get<AcademicUnit[]>("/units");
  },

  createUnit(payload: CreateUnitPayload): Promise<ApiResult<AcademicUnit>> {
    return apiWithMessage.post<AcademicUnit>("/units", payload);
  },

  /** Deactivate rather than delete. A unit with academic history stays in the data. */
  updateUnit(id: string, payload: UpdateUnitPayload): Promise<ApiResult<AcademicUnit>> {
    return apiWithMessage.patch<AcademicUnit>(`/units/${id}`, payload);
  },

  listProgrammes(unitId: string): Promise<Programme[]> {
    return api.get<Programme[]>(`/units/${unitId}/programmes`);
  },

  createProgramme(
    unitId: string,
    payload: CreateProgrammePayload,
  ): Promise<ApiResult<Programme>> {
    return apiWithMessage.post<Programme>(`/units/${unitId}/programmes`, payload);
  },

  updateProgramme(id: string, payload: UpdateProgrammePayload): Promise<ApiResult<Programme>> {
    return apiWithMessage.patch<Programme>(`/programmes/${id}`, payload);
  },

  listModules(unitId: string): Promise<ProjectModule[]> {
    return api.get<ProjectModule[]>(`/units/${unitId}/modules`);
  },

  createModule(unitId: string, payload: CreateModulePayload): Promise<ApiResult<ProjectModule>> {
    return apiWithMessage.post<ProjectModule>(`/units/${unitId}/modules`, payload);
  },

  updateModule(id: string, payload: UpdateModulePayload): Promise<ApiResult<ProjectModule>> {
    return apiWithMessage.patch<ProjectModule>(`/modules/${id}`, payload);
  },

  /** The links, not the programmes. Resolve the ids against the programme list. */
  listModuleProgrammes(moduleId: string): Promise<ModuleProgrammeLink[]> {
    return api.get<ModuleProgrammeLink[]>(`/modules/${moduleId}/programmes`);
  },

  // A full set replace. Cross-school links are service teaching, so anyone else gets a 403.
  setModuleProgrammes(
    moduleId: string,
    programmeIds: string[],
  ): Promise<ApiResult<ModuleProgrammeLink[]>> {
    return apiWithMessage.put<ModuleProgrammeLink[]>(`/modules/${moduleId}/programmes`, {
      programmeIds,
    });
  },

  listOfferings(moduleId: string): Promise<ModuleOffering[]> {
    return api.get<ModuleOffering[]>(`/modules/${moduleId}/offerings`);
  },

  createOffering(
    moduleId: string,
    payload: CreateOfferingPayload,
  ): Promise<ApiResult<ModuleOffering>> {
    return apiWithMessage.post<ModuleOffering>(`/modules/${moduleId}/offerings`, payload);
  },

  /** Deadline and threshold only. maxMarkersPerProject is fixed at creation. */
  updateOffering(
    id: string,
    payload: UpdateOfferingPayload,
  ): Promise<ApiResult<ModuleOffering>> {
    return apiWithMessage.patch<ModuleOffering>(`/offerings/${id}`, payload);
  },

  /** Moves an offering back to marking. System administrator only. */
  reopenOffering(id: string): Promise<ApiResult<ModuleOffering>> {
    return apiWithMessage.post<ModuleOffering>(`/offerings/${id}/reopen`);
  },

  /** Create only and idempotent: an identical row is unchanged, a clashing code fails. */
  importProgrammes(
    unitId: string,
    file: File,
    dryRun: boolean,
  ): Promise<ApiResult<ImportReport>> {
    return postImport(`/units/${unitId}/programmes/import`, file, dryRun);
  },

  importModules(unitId: string, file: File, dryRun: boolean): Promise<ApiResult<ImportReport>> {
    return postImport(`/units/${unitId}/modules/import`, file, dryRun);
  },

  /** Additive only. Removing a link is the module's programme editor's job. */
  importModuleProgrammeLinks(
    unitId: string,
    file: File,
    dryRun: boolean,
  ): Promise<ApiResult<ImportReport>> {
    return postImport(`/units/${unitId}/module-programmes/import`, file, dryRun);
  },

  // Carries threshold and marker cap forward, never the deadline.
  rolloverOfferings(
    unitId: string,
    payload: { fromYear: string; toYear: string; dryRun?: boolean },
  ): Promise<ApiResult<ImportReport>> {
    return apiWithMessage
      .post<{ report: ImportReport }>(`/units/${unitId}/offerings/rollover`, payload)
      .then(({ data, message }) => ({ data: data.report, message }));
  },
};

/** The upload routes take multipart `file` plus `dryRun` as a literal string. */
function postImport(
  url: string,
  file: File,
  dryRun: boolean,
): Promise<ApiResult<ImportReport>> {
  const body = new FormData();
  body.append("file", file);
  body.append("dryRun", dryRun ? "true" : "false");
  return apiWithMessage
    .post<{ report: ImportReport }>(url, body)
    .then(({ data, message }) => ({ data: data.report, message }));
}
