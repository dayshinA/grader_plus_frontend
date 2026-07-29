import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { useCreateSchool } from "~/features/schools/api/use-create-school";
import { useDeactivateSchool } from "~/features/schools/api/use-deactivate-school";
import { useUpdateSchool } from "~/features/schools/api/use-update-school";
import { schoolsQueryKey } from "~/features/schools/api/use-schools";
import { schoolsService } from "~/features/schools/api/schools.service";

vi.mock("~/features/schools/api/schools.service", () => ({
  schoolsService: {
    getSchools: vi.fn(),
    createSchool: vi.fn(),
    updateSchool: vi.fn(),
    deactivateSchool: vi.fn(),
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

describe("school mutation hooks", () => {
  it("useCreateSchool calls the service and invalidates the schools query on success", async () => {
    const { wrapper, invalidateSpy } = createWrapper();
    vi.mocked(schoolsService.createSchool).mockResolvedValue({
      data: { id: "s1", code: "SCI", name: "School of Science", isActive: true, createdAt: "2026-07-29" },
      message: "School created successfully.",
    });

    const { result } = renderHook(() => useCreateSchool(), { wrapper });
    result.current.mutate({ code: "SCI", name: "School of Science" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(schoolsService.createSchool).toHaveBeenCalledOnce();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: schoolsQueryKey });
  });

  it("useUpdateSchool calls the service with id/request and invalidates on success", async () => {
    const { wrapper, invalidateSpy } = createWrapper();
    vi.mocked(schoolsService.updateSchool).mockResolvedValue({
      data: { id: "s1", code: "SCI", name: "School of Science", isActive: true, createdAt: "2026-07-29" },
      message: "School updated successfully.",
    });

    const { result } = renderHook(() => useUpdateSchool(), { wrapper });
    result.current.mutate({ id: "s1", request: { isActive: true } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(schoolsService.updateSchool).toHaveBeenCalledWith("s1", { isActive: true });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: schoolsQueryKey });
  });

  it("useDeactivateSchool calls the service and invalidates on success", async () => {
    const { wrapper, invalidateSpy } = createWrapper();
    vi.mocked(schoolsService.deactivateSchool).mockResolvedValue({
      data: { id: "s1" },
      message: "School deactivated successfully.",
    });

    const { result } = renderHook(() => useDeactivateSchool(), { wrapper });
    result.current.mutate("s1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(schoolsService.deactivateSchool).toHaveBeenCalledWith("s1");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: schoolsQueryKey });
  });
});
