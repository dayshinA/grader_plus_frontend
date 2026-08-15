import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { dashboardKeys } from "~/features/dashboard/api/use-dashboard";
import { intakeService } from "~/features/intake/api/intake.service";
import type {
  CreateProjectPayload,
  ExcludeProjectPayload,
  UpdateProjectPayload,
} from "~/features/intake/types";

export const intakeKeys = {
  all: ["intake"] as const,
  projects: (offeringId: string) => [...intakeKeys.all, "projects", offeringId] as const,
  project: (projectId: string) => [...intakeKeys.all, "project", projectId] as const,
  submissions: (projectId: string) => [...intakeKeys.all, "submissions", projectId] as const,
  report: (offeringId: string, jobId: string) =>
    [...intakeKeys.all, "report", offeringId, jobId] as const,
};

export function useProjects(offeringId: string | undefined) {
  return useQuery({
    queryKey: intakeKeys.projects(offeringId ?? ""),
    queryFn: () => intakeService.listProjects(offeringId as string),
    enabled: Boolean(offeringId),
    staleTime: 30 * 1000,
  });
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: intakeKeys.project(projectId ?? ""),
    queryFn: () => intakeService.getProject(projectId as string),
    enabled: Boolean(projectId),
    staleTime: 30 * 1000,
  });
}

export function useSubmissions(projectId: string | undefined) {
  return useQuery({
    queryKey: intakeKeys.submissions(projectId ?? ""),
    queryFn: () => intakeService.listSubmissions(projectId as string),
    enabled: Boolean(projectId),
    staleTime: 60 * 1000,
  });
}

export function useIntakeReport(offeringId: string, jobId: string | undefined) {
  return useQuery({
    queryKey: intakeKeys.report(offeringId, jobId ?? ""),
    queryFn: () => intakeService.report(offeringId, jobId as string),
    enabled: Boolean(offeringId && jobId),
  });
}

/** The intake changes the project list and every count derived from it. */
function invalidateOffering(
  queryClient: ReturnType<typeof useQueryClient>,
  offeringId: string,
) {
  void queryClient.invalidateQueries({ queryKey: intakeKeys.projects(offeringId) });
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
}

export function useUploadArchive(offeringId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (percent: number) => void;
    }) => intakeService.uploadArchive(offeringId, file, onProgress),
    onSuccess: () => invalidateOffering(queryClient, offeringId),
  });
}

export function useCreateProject(offeringId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProjectPayload) =>
      intakeService.createProject(offeringId, payload),
    onSuccess: () => invalidateOffering(queryClient, offeringId),
  });
}

export function useUpdateProject(offeringId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, payload }: { projectId: string; payload: UpdateProjectPayload }) =>
      intakeService.updateProject(projectId, payload),
    onSuccess: (_result, { projectId }) => {
      invalidateOffering(queryClient, offeringId);
      void queryClient.invalidateQueries({ queryKey: intakeKeys.project(projectId) });
    },
  });
}

export function useDeleteProject(offeringId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => intakeService.deleteProject(projectId),
    onSuccess: () => invalidateOffering(queryClient, offeringId),
  });
}

export function useExcludeProject(offeringId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      payload,
    }: {
      projectId: string;
      payload: ExcludeProjectPayload;
    }) => intakeService.excludeProject(projectId, payload),
    onSuccess: () => invalidateOffering(queryClient, offeringId),
  });
}

export function useIncludeProject(offeringId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => intakeService.includeProject(projectId),
    onSuccess: () => invalidateOffering(queryClient, offeringId),
  });
}

export function useUploadSubmission(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => intakeService.uploadSubmission(projectId, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: intakeKeys.submissions(projectId) });
    },
  });
}

export function useDeleteSubmission(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (submissionId: string) => intakeService.deleteSubmission(submissionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: intakeKeys.submissions(projectId) });
    },
  });
}
