import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { useGrantModuleCreation } from "~/features/module-creation-grants/api/use-grant-module-creation";
import { useRevokeModuleCreation } from "~/features/module-creation-grants/api/use-revoke-module-creation";
import { moduleCreationGrantsQueryKey } from "~/features/module-creation-grants/api/use-module-creation-grants";
import { moduleCreationGrantsService } from "~/features/module-creation-grants/api/module-creation-grants.service";

vi.mock("~/features/module-creation-grants/api/module-creation-grants.service", () => ({
  moduleCreationGrantsService: {
    getGrants: vi.fn(),
    grantModuleCreation: vi.fn(),
    revokeModuleCreation: vi.fn(),
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
  grantedAt: "2026-07-20T00:00:00.000Z",
  revokedBy: null,
  revokedAt: null,
};

describe("module creation grant mutation hooks", () => {
  it("useGrantModuleCreation calls the service with departmentId/coordinatorId and invalidates that department's grants query", async () => {
    const { wrapper, invalidateSpy } = createWrapper();
    vi.mocked(moduleCreationGrantsService.grantModuleCreation).mockResolvedValue({
      data: GRANT,
      message: "Module creation permission granted.",
    });

    const { result } = renderHook(() => useGrantModuleCreation(), { wrapper });
    result.current.mutate({ departmentId: "d1", coordinatorId: "c1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(moduleCreationGrantsService.grantModuleCreation).toHaveBeenCalledWith("d1", {
      coordinatorId: "c1",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: moduleCreationGrantsQueryKey("d1"),
    });
  });

  it("useRevokeModuleCreation calls the service with departmentId/coordinatorId and invalidates that department's grants query", async () => {
    const { wrapper, invalidateSpy } = createWrapper();
    vi.mocked(moduleCreationGrantsService.revokeModuleCreation).mockResolvedValue({
      data: { ...GRANT, isActive: false, revokedBy: "sa1", revokedAt: "2026-07-21T00:00:00.000Z" },
      message: "Module creation permission revoked.",
    });

    const { result } = renderHook(() => useRevokeModuleCreation(), { wrapper });
    result.current.mutate({ departmentId: "d1", coordinatorId: "c1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(moduleCreationGrantsService.revokeModuleCreation).toHaveBeenCalledWith("d1", "c1");
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: moduleCreationGrantsQueryKey("d1"),
    });
  });
});
