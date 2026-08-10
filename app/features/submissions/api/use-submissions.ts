import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { dashboardQueryKey } from "~/features/dashboard/api/use-dashboard";
import { submissionsService } from "~/features/submissions/api/submissions.service";

export const studentSubmissionsQueryKey = (moduleId: string, studentId: string) =>
  ["submissions", moduleId, studentId] as const;

/**
 * One student's uploaded files. `enabled` is what makes this fetch-on-open rather than
 * fetch-per-row: the dialog passes a real `studentId` only once it's actually showing.
 */
export function useStudentSubmissions(
  moduleId: string | undefined,
  studentId: string | undefined,
) {
  return useQuery({
    queryKey: studentSubmissionsQueryKey(moduleId ?? "", studentId ?? ""),
    queryFn: () =>
      submissionsService.listForStudent(moduleId as string, studentId as string),
    enabled: Boolean(moduleId && studentId),
  });
}

/**
 * The ZIP import.
 *
 * Invalidates the module's dashboard rather than any submissions key: the dashboard is where the
 * student roster comes from, and a successful upload is exactly the thing that adds students to
 * it. The per-student file lists are keyed separately and refetch on open anyway.
 */
export function useBulkUploadSubmissions(moduleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => submissionsService.bulkUpload(moduleId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardQueryKey(moduleId) });
      queryClient.invalidateQueries({ queryKey: ["submissions", moduleId] });
    },
  });
}

/**
 * Resolves a presigned download URL on demand.
 *
 * A mutation rather than a query despite being a GET: it's an action taken on click whose result
 * is used once and must never be served from cache — the URL dies after 300 seconds, and a cached
 * one would hand the user a broken link.
 */
export function useResolveDownloadUrl(moduleId: string) {
  return useMutation({
    mutationFn: ({ studentId, submissionId }: { studentId: string; submissionId: string }) =>
      submissionsService.getDownloadUrl(moduleId, studentId, submissionId),
  });
}
