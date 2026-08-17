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

/**
 * The academic hierarchy. Two levels of unit, then programmes and modules as siblings
 * linked many to many, then one offering per module per academic year.
 *
 * Every list here returns its full set: there is no pagination anywhere in this API.
 */
export const structureService = {
  /** Narrowed server side to what the caller's grants reach. A 403 means out of scope. */
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

  /**
   * A full set replace, not a tag picker: what you send is what the module has afterwards,
   * and an empty array unlinks everything. A link crossing two schools is service teaching
   * and only a system administrator can make it, so anyone else gets a 403.
   */
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

  /**
   * Create only, partial, idempotent on re-upload. A row matching an existing programme
   * exactly is unchanged; a code held with a different title or level fails its row.
   */
  importProgrammes(
    unitId: string,
    file: File,
    dryRun: boolean,
  ): Promise<ApiResult<ImportReport>> {
    return postImport(`/units/${unitId}/programmes/import`, file, dryRun);
  },

  /** The programme import's mirror: code and title, no link columns by design. */
  importModules(unitId: string, file: File, dryRun: boolean): Promise<ApiResult<ImportReport>> {
    return postImport(`/units/${unitId}/modules/import`, file, dryRun);
  },

  /**
   * Additive only: a row adds one link and an import never removes one. Removal stays with
   * the module's programme editor, which replaces the full set.
   */
  importModuleProgrammeLinks(
    unitId: string,
    file: File,
    dryRun: boolean,
  ): Promise<ApiResult<ImportReport>> {
    return postImport(`/units/${unitId}/module-programmes/import`, file, dryRun);
  },

  /**
   * Opens the new year's offering for every active module the unit administers, carrying
   * threshold and marker cap forward and never the deadline. Not an upload: the system
   * already knows which modules ran last year.
   */
  rolloverOfferings(
    unitId: string,
    payload: { fromYear: string; toYear: string; dryRun?: boolean },
  ): Promise<ApiResult<ImportReport>> {
    return apiWithMessage
      .post<{ report: ImportReport }>(`/units/${unitId}/offerings/rollover`, payload)
      .then(({ data, message }) => ({ data: data.report, message }));
  },
};

/** The upload routes all take multipart `file` plus `dryRun` as a literal string. */
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
