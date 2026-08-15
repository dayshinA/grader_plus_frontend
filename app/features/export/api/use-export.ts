import { useQuery } from "@tanstack/react-query";

import { exportService } from "~/features/export/api/export.service";

export const exportKeys = {
  all: ["export"] as const,
  preview: (offeringId: string) => [...exportKeys.all, "preview", offeringId] as const,
};

/**
 * Deliberately short lived: a marker submitting or a case being settled changes what is
 * exportable, and an export decision made from a stale preview is the wrong decision.
 */
export function useExportPreview(offeringId: string | undefined) {
  return useQuery({
    queryKey: exportKeys.preview(offeringId ?? ""),
    queryFn: () => exportService.preview(offeringId as string),
    enabled: Boolean(offeringId),
    staleTime: 10 * 1000,
  });
}
