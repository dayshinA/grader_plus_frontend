import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { useGrantDepartmentAdmin } from "~/features/department-admin-grants/api/use-grant-department-admin";
import { useRevokeDepartmentAdmin } from "~/features/department-admin-grants/api/use-revoke-department-admin";
import { departmentAdminGrantsQueryKey } from "~/features/department-admin-grants/api/use-department-admin-grants";
import { departmentAdminGrantsService } from "~/features/department-admin-grants/api/department-admin-grants.service";

vi.mock("~/features/department-admin-grants/api/department-admin-grants.service", () => ({
  departmentAdminGrantsService: {
    getGrants: vi.fn(),
    grantDepartmentAdmin: vi.fn(),
    revokeDepartmentAdmin: vi.fn(),
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
  departmentId: "d1",
  coordinatorId: "c1",
  isActive: true,
  grantedBy: "sa1",
  grantedAt: "2026-07-11T00:00:00.000Z",
  revokedBy: null,
  revokedAt: null,
};

describe("department admin grant mutation hooks", () => {
  it("useGrantDepartmentAdmin calls the service with departmentId/coordinatorId and invalidates that department's grants query", async () => {
    const { wrapper, invalidateSpy } = createWrapper();
    vi.mocked(departmentAdminGrantsService.grantDepartmentAdmin).mockResolvedValue({
      data: GRANT,
      message: "Department Admin granted successfully.",
    });

    const { result } = renderHook(() => useGrantDepartmentAdmin(), { wrapper });
    result.current.mutate({ departmentId: "d1", coordinatorId: "c1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(departmentAdminGrantsService.grantDepartmentAdmin).toHaveBeenCalledWith("d1", {
      coordinatorId: "c1",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: departmentAdminGrantsQueryKey("d1"),
    });
  });

  it("useRevokeDepartmentAdmin calls the service with departmentId/coordinatorId and invalidates that department's grants query", async () => {
    const { wrapper, invalidateSpy } = createWrapper();
    vi.mocked(departmentAdminGrantsService.revokeDepartmentAdmin).mockResolvedValue({
      data: { ...GRANT, isActive: false, revokedBy: "sa1", revokedAt: "2026-07-12T00:00:00.000Z" },
      message: "Department Admin revoked successfully.",
    });

    const { result } = renderHook(() => useRevokeDepartmentAdmin(), { wrapper });
    result.current.mutate({ departmentId: "d1", coordinatorId: "c1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(departmentAdminGrantsService.revokeDepartmentAdmin).toHaveBeenCalledWith("d1", "c1");
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: departmentAdminGrantsQueryKey("d1"),
    });
  });
});
