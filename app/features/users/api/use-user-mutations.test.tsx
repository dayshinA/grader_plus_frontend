import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { useCreateUser } from "~/features/users/api/use-create-user";
import { useDeactivateUser } from "~/features/users/api/use-deactivate-user";
import { useUpdateUser } from "~/features/users/api/use-update-user";
import { usersQueryKey } from "~/features/users/api/use-users";
import { usersService } from "~/features/users/api/users.service";

vi.mock("~/features/users/api/users.service", () => ({
  usersService: {
    getUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deactivateUser: vi.fn(),
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

describe("user mutation hooks", () => {
  it("useCreateUser calls the service and invalidates the users query on success", async () => {
    const { wrapper, invalidateSpy } = createWrapper();
    vi.mocked(usersService.createUser).mockResolvedValue({
      data: {
        id: "u1",
        email: "new@lboro.ac.uk",
        fullName: "New User",
        role: "marker",
        learnId: null,
        isActive: true,
        createdAt: "2026-07-09",
      },
      message: "User created successfully.",
    });

    const { result } = renderHook(() => useCreateUser(), { wrapper });
    result.current.mutate({
      email: "new@lboro.ac.uk",
      password: "password123",
      fullName: "New User",
      role: "marker",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(usersService.createUser).toHaveBeenCalledOnce();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: usersQueryKey });
  });

  it("useUpdateUser calls the service with id/request and invalidates on success", async () => {
    const { wrapper, invalidateSpy } = createWrapper();
    vi.mocked(usersService.updateUser).mockResolvedValue({
      data: {
        id: "u1",
        email: "x@lboro.ac.uk",
        fullName: "X",
        role: "marker",
        learnId: null,
        isActive: true,
        createdAt: "2026-07-09",
      },
      message: "User updated successfully.",
    });

    const { result } = renderHook(() => useUpdateUser(), { wrapper });
    result.current.mutate({ id: "u1", request: { isActive: true } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(usersService.updateUser).toHaveBeenCalledWith("u1", { isActive: true });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: usersQueryKey });
  });

  it("useDeactivateUser calls the service and invalidates on success", async () => {
    const { wrapper, invalidateSpy } = createWrapper();
    vi.mocked(usersService.deactivateUser).mockResolvedValue({
      data: { id: "u1" },
      message: "User deactivated successfully.",
    });

    const { result } = renderHook(() => useDeactivateUser(), { wrapper });
    result.current.mutate("u1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(usersService.deactivateUser).toHaveBeenCalledWith("u1");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: usersQueryKey });
  });
});
