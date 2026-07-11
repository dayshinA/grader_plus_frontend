import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { useCreateModule } from "~/features/academic-modules/api/use-create-module";
import { useDeactivateModule } from "~/features/academic-modules/api/use-deactivate-module";
import { useUpdateModule } from "~/features/academic-modules/api/use-update-module";
import { academicModulesQueryKey } from "~/features/academic-modules/api/use-academic-modules";
import { academicModulesService } from "~/features/academic-modules/api/academic-modules.service";

vi.mock("~/features/academic-modules/api/academic-modules.service", () => ({
  academicModulesService: {
    getModules: vi.fn(),
    createModule: vi.fn(),
    updateModule: vi.fn(),
    deactivateModule: vi.fn(),
  },
}));

const module1 = {
  id: "m1",
  code: "COMP101",
  name: "Intro to Computing",
  learnId: null,
  coordinatorId: "u1",
  departmentId: "d1",
  discrepancyThreshold: 10,
  markingDeadline: "2026-08-01",
  isActive: true,
  createdAt: "2026-07-11",
};

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

describe("academic module mutation hooks", () => {
  it("useCreateModule calls the service and invalidates the academic-modules query on success", async () => {
    const { wrapper, invalidateSpy } = createWrapper();
    vi.mocked(academicModulesService.createModule).mockResolvedValue({
      data: module1,
      message: "Module created successfully.",
    });

    const { result } = renderHook(() => useCreateModule(), { wrapper });
    result.current.mutate({
      code: "COMP101",
      name: "Intro to Computing",
      departmentId: "d1",
      discrepancyThreshold: 10,
      markingDeadline: "2026-08-01",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(academicModulesService.createModule).toHaveBeenCalledOnce();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: academicModulesQueryKey });
  });

  it("useUpdateModule calls the service with id/request and invalidates on success", async () => {
    const { wrapper, invalidateSpy } = createWrapper();
    vi.mocked(academicModulesService.updateModule).mockResolvedValue({
      data: module1,
      message: "Module updated successfully.",
    });

    const { result } = renderHook(() => useUpdateModule(), { wrapper });
    result.current.mutate({ id: "m1", request: { isActive: true } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(academicModulesService.updateModule).toHaveBeenCalledWith("m1", { isActive: true });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: academicModulesQueryKey });
  });

  it("useDeactivateModule calls the service and invalidates on success", async () => {
    const { wrapper, invalidateSpy } = createWrapper();
    vi.mocked(academicModulesService.deactivateModule).mockResolvedValue({
      data: { id: "m1" },
      message: "Module deactivated successfully.",
    });

    const { result } = renderHook(() => useDeactivateModule(), { wrapper });
    result.current.mutate("m1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(academicModulesService.deactivateModule).toHaveBeenCalledWith("m1");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: academicModulesQueryKey });
  });
});
