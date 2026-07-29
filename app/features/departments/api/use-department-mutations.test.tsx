import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { useCreateDepartment } from "~/features/departments/api/use-create-department";
import { useDeactivateDepartment } from "~/features/departments/api/use-deactivate-department";
import { useUpdateDepartment } from "~/features/departments/api/use-update-department";
import { departmentsQueryKey } from "~/features/departments/api/use-departments";
import { departmentsService } from "~/features/departments/api/departments.service";

vi.mock("~/features/departments/api/departments.service", () => ({
  departmentsService: {
    getDepartments: vi.fn(),
    createDepartment: vi.fn(),
    updateDepartment: vi.fn(),
    deactivateDepartment: vi.fn(),
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

describe("department mutation hooks", () => {
  it("useCreateDepartment calls the service and invalidates the departments query on success", async () => {
    const { wrapper, invalidateSpy } = createWrapper();
    vi.mocked(departmentsService.createDepartment).mockResolvedValue({
      data: {
        id: "d1",
        code: "CS",
        name: "Department of Computer Science",
        schoolId: "s1",
        isActive: true,
        createdAt: "2026-07-11",
      },
      message: "Department created successfully.",
    });

    const { result } = renderHook(() => useCreateDepartment(), { wrapper });
    result.current.mutate({ code: "CS", name: "Department of Computer Science", schoolId: "s1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(departmentsService.createDepartment).toHaveBeenCalledOnce();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: departmentsQueryKey });
  });

  it("useUpdateDepartment calls the service with id/request and invalidates on success", async () => {
    const { wrapper, invalidateSpy } = createWrapper();
    vi.mocked(departmentsService.updateDepartment).mockResolvedValue({
      data: {
        id: "d1",
        code: "CS",
        name: "Department of Computer Science",
        schoolId: "s1",
        isActive: true,
        createdAt: "2026-07-11",
      },
      message: "Department updated successfully.",
    });

    const { result } = renderHook(() => useUpdateDepartment(), { wrapper });
    result.current.mutate({ id: "d1", request: { isActive: true } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(departmentsService.updateDepartment).toHaveBeenCalledWith("d1", { isActive: true });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: departmentsQueryKey });
  });

  it("useDeactivateDepartment calls the service and invalidates on success", async () => {
    const { wrapper, invalidateSpy } = createWrapper();
    vi.mocked(departmentsService.deactivateDepartment).mockResolvedValue({
      data: { id: "d1" },
      message: "Department deactivated successfully.",
    });

    const { result } = renderHook(() => useDeactivateDepartment(), { wrapper });
    result.current.mutate("d1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(departmentsService.deactivateDepartment).toHaveBeenCalledWith("d1");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: departmentsQueryKey });
  });
});
