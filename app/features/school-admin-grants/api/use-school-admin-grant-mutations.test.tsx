import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { useGrantSchoolAdmin } from "~/features/school-admin-grants/api/use-grant-school-admin";
import { useRevokeSchoolAdmin } from "~/features/school-admin-grants/api/use-revoke-school-admin";
import { schoolAdminGrantsQueryKey } from "~/features/school-admin-grants/api/use-school-admin-grants";
import { schoolAdminGrantsService } from "~/features/school-admin-grants/api/school-admin-grants.service";

vi.mock("~/features/school-admin-grants/api/school-admin-grants.service", () => ({
  schoolAdminGrantsService: {
    getGrants: vi.fn(),
    grantSchoolAdmin: vi.fn(),
    revokeSchoolAdmin: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidateSpy };
}

const GRANT = {
  schoolId: "s1",
  coordinatorId: "c1",
  isActive: true,
  grantedBy: "sa1",
  grantedAt: "2026-07-29T00:00:00.000Z",
  revokedBy: null,
  revokedAt: null,
};

describe("school admin grant mutation hooks", () => {
  it("useGrantSchoolAdmin calls the service with schoolId/coordinatorId and invalidates that school's grants query", async () => {
    const { wrapper, invalidateSpy } = createWrapper();
    vi.mocked(schoolAdminGrantsService.grantSchoolAdmin).mockResolvedValue({
      data: GRANT,
      message: "School admin permission granted.",
    });

    const { result } = renderHook(() => useGrantSchoolAdmin(), { wrapper });
    result.current.mutate({ schoolId: "s1", coordinatorId: "c1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(schoolAdminGrantsService.grantSchoolAdmin).toHaveBeenCalledWith("s1", {
      coordinatorId: "c1",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: schoolAdminGrantsQueryKey("s1"),
    });
  });

  it("useRevokeSchoolAdmin calls the service with schoolId/coordinatorId and invalidates that school's grants query", async () => {
    const { wrapper, invalidateSpy } = createWrapper();
    vi.mocked(schoolAdminGrantsService.revokeSchoolAdmin).mockResolvedValue({
      data: { ...GRANT, isActive: false, revokedBy: "sa1", revokedAt: "2026-07-30T00:00:00.000Z" },
      message: "School admin permission revoked.",
    });

    const { result } = renderHook(() => useRevokeSchoolAdmin(), { wrapper });
    result.current.mutate({ schoolId: "s1", coordinatorId: "c1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(schoolAdminGrantsService.revokeSchoolAdmin).toHaveBeenCalledWith("s1", "c1");
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: schoolAdminGrantsQueryKey("s1"),
    });
  });
});
