import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

import { dashboardKeys } from "~/features/dashboard/api/use-dashboard";
import { structureService } from "~/features/structure/api/structure.service";
import type {
  CreateModulePayload,
  CreateOfferingPayload,
  CreateProgrammePayload,
  CreateUnitPayload,
  UpdateModulePayload,
  UpdateOfferingPayload,
  UpdateProgrammePayload,
  UpdateUnitPayload,
} from "~/features/structure/types";

export const structureKeys = {
  all: ["structure"] as const,
  units: () => [...structureKeys.all, "units"] as const,
  programmes: (unitId: string) => [...structureKeys.all, "programmes", unitId] as const,
  modules: (unitId: string) => [...structureKeys.all, "modules", unitId] as const,
  moduleProgrammes: (moduleId: string) =>
    [...structureKeys.all, "module-programmes", moduleId] as const,
  offerings: (moduleId: string) => [...structureKeys.all, "offerings", moduleId] as const,
};

/** Structure changes rarely and every screen leans on it, so it holds for a while. */
const STRUCTURE_STALE_MS = 5 * 60 * 1000;

export function useUnits(enabled = true) {
  return useQuery({
    queryKey: structureKeys.units(),
    queryFn: () => structureService.listUnits(),
    staleTime: STRUCTURE_STALE_MS,
    enabled,
  });
}

// No cross university module route, so this asks per unit on the same keys and flattens.
export function useModulesForUnits(unitIds: string[]) {
  return useQueries({
    queries: unitIds.map((unitId) => ({
      queryKey: structureKeys.modules(unitId),
      queryFn: () => structureService.listModules(unitId),
      staleTime: STRUCTURE_STALE_MS,
    })),
    combine: (results) => ({
      modules: results.flatMap((result) => result.data ?? []),
      isLoading: results.some((result) => result.isLoading),
    }),
  });
}

export function useProgrammes(unitId: string | undefined) {
  return useQuery({
    queryKey: structureKeys.programmes(unitId ?? ""),
    queryFn: () => structureService.listProgrammes(unitId as string),
    enabled: Boolean(unitId),
    staleTime: STRUCTURE_STALE_MS,
  });
}

export function useModules(unitId: string | undefined) {
  return useQuery({
    queryKey: structureKeys.modules(unitId ?? ""),
    queryFn: () => structureService.listModules(unitId as string),
    enabled: Boolean(unitId),
    staleTime: STRUCTURE_STALE_MS,
  });
}

export function useModuleProgrammes(moduleId: string | undefined) {
  return useQuery({
    queryKey: structureKeys.moduleProgrammes(moduleId ?? ""),
    queryFn: () => structureService.listModuleProgrammes(moduleId as string),
    enabled: Boolean(moduleId),
    staleTime: STRUCTURE_STALE_MS,
  });
}

export function useOfferings(moduleId: string | undefined) {
  return useQuery({
    queryKey: structureKeys.offerings(moduleId ?? ""),
    queryFn: () => structureService.listOfferings(moduleId as string),
    enabled: Boolean(moduleId),
    staleTime: 60 * 1000,
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUnitPayload) => structureService.createUnit(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: structureKeys.units() });
    },
  });
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUnitPayload }) =>
      structureService.updateUnit(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: structureKeys.units() });
    },
  });
}

export function useCreateProgramme(unitId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProgrammePayload) =>
      structureService.createProgramme(unitId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: structureKeys.programmes(unitId) });
    },
  });
}

export function useUpdateProgramme(unitId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProgrammePayload }) =>
      structureService.updateProgramme(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: structureKeys.programmes(unitId) });
    },
  });
}

export function useCreateModule(unitId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateModulePayload) => structureService.createModule(unitId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: structureKeys.modules(unitId) });
    },
  });
}

export function useUpdateModule(unitId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateModulePayload }) =>
      structureService.updateModule(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: structureKeys.modules(unitId) });
    },
  });
}

/** The whole set replaces what was there, so the answer is refetched rather than patched. */
export function useSetModuleProgrammes(moduleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (programmeIds: string[]) =>
      structureService.setModuleProgrammes(moduleId, programmeIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: structureKeys.moduleProgrammes(moduleId) });
    },
  });
}

export function useCreateOffering(moduleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOfferingPayload) =>
      structureService.createOffering(moduleId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: structureKeys.offerings(moduleId) });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

/** Several people can move an offering's status, so readers are invalidated, not patched. */
export function useUpdateOffering(offeringId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateOfferingPayload) =>
      structureService.updateOffering(offeringId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: structureKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

export function useReopenOffering(offeringId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => structureService.reopenOffering(offeringId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: structureKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

// The import mutations invalidate on apply only: a dry run writes nothing.

export function useImportProgrammes(unitId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, dryRun }: { file: File; dryRun: boolean }) =>
      structureService.importProgrammes(unitId, file, dryRun),
    onSuccess: (_result, { dryRun }) => {
      if (dryRun) return;
      void queryClient.invalidateQueries({ queryKey: structureKeys.programmes(unitId) });
    },
  });
}

export function useImportModules(unitId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, dryRun }: { file: File; dryRun: boolean }) =>
      structureService.importModules(unitId, file, dryRun),
    onSuccess: (_result, { dryRun }) => {
      if (dryRun) return;
      void queryClient.invalidateQueries({ queryKey: structureKeys.modules(unitId) });
    },
  });
}

/** The rows land on modules, not the unit, so every cached link set is refetched. */
export function useImportModuleProgrammeLinks(unitId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, dryRun }: { file: File; dryRun: boolean }) =>
      structureService.importModuleProgrammeLinks(unitId, file, dryRun),
    onSuccess: (_result, { dryRun }) => {
      if (dryRun) return;
      void queryClient.invalidateQueries({
        queryKey: [...structureKeys.all, "module-programmes"],
      });
    },
  });
}

/** The report does not carry the created offerings, so the lists are refetched. */
export function useRolloverOfferings(unitId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { fromYear: string; toYear: string; dryRun?: boolean }) =>
      structureService.rolloverOfferings(unitId, payload),
    onSuccess: (_result, { dryRun }) => {
      if (dryRun) return;
      void queryClient.invalidateQueries({ queryKey: [...structureKeys.all, "offerings"] });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}
