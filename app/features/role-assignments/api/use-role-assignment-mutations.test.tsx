import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { roleAssignmentsService } from "~/features/role-assignments/api/role-assignments.service";
import { useCreateRoleAssignment } from "~/features/role-assignments/api/use-create-role-assignment";
import { useGrantExtraPermission } from "~/features/role-assignments/api/use-grant-extra-permission";
import { useRevokeExtraPermission } from "~/features/role-assignments/api/use-revoke-extra-permission";
import { useRevokeRoleAssignment } from "~/features/role-assignments/api/use-revoke-role-assignment";
import { userRoleAssignmentsQueryKey } from "~/features/role-assignments/api/use-user-role-assignments";

vi.mock("~/features/role-assignments/api/role-assignments.service", () => ({
  roleAssignmentsService: {
    listForUser: vi.fn(),
    create: vi.fn(),
    revoke: vi.fn(),
    grantExtraPermission: vi.fn(),
    revokeExtraPermission: vi.fn(),
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

const ok = { data: { id: "a1" }, message: "Done." };

describe("role assignment mutation hooks", () => {
  it("useCreateRoleAssignment invalidates the target user's assignments", async () => {
    const { wrapper, invalidateSpy } = createWrapper();
    vi.mocked(roleAssignmentsService.create).mockResolvedValue(ok as never);

    const { result } = renderHook(() => useCreateRoleAssignment(), { wrapper });
    result.current.mutate({
      userId: "u1",
      roleTemplateKey: "marker",
      scopeType: "global",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: userRoleAssignmentsQueryKey("u1"),
    });
  });

  it("useRevokeRoleAssignment calls the service with the assignment id alone", async () => {
    // userId rides along purely so the right list can be invalidated — the
    // endpoint is addressed by assignment id.
    const { wrapper, invalidateSpy } = createWrapper();
    vi.mocked(roleAssignmentsService.revoke).mockResolvedValue(ok as never);

    const { result } = renderHook(() => useRevokeRoleAssignment(), { wrapper });
    result.current.mutate({ assignmentId: "a1", userId: "u1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(roleAssignmentsService.revoke).toHaveBeenCalledWith("a1");
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: userRoleAssignmentsQueryKey("u1"),
    });
  });

  it("useGrantExtraPermission passes assignment id + key and invalidates", async () => {
    const { wrapper, invalidateSpy } = createWrapper();
    vi.mocked(roleAssignmentsService.grantExtraPermission).mockResolvedValue(
      ok as never,
    );

    const { result } = renderHook(() => useGrantExtraPermission(), { wrapper });
    result.current.mutate({
      assignmentId: "a1",
      permissionKey: "grades.export",
      userId: "u1",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(roleAssignmentsService.grantExtraPermission).toHaveBeenCalledWith(
      "a1",
      "grades.export",
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: userRoleAssignmentsQueryKey("u1"),
    });
  });

  it("useRevokeExtraPermission passes assignment id + permission *id* and invalidates", async () => {
    const { wrapper, invalidateSpy } = createWrapper();
    vi.mocked(roleAssignmentsService.revokeExtraPermission).mockResolvedValue(
      ok as never,
    );

    const { result } = renderHook(() => useRevokeExtraPermission(), { wrapper });
    result.current.mutate({
      assignmentId: "a1",
      permissionId: "perm-uuid-1",
      userId: "u1",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(roleAssignmentsService.revokeExtraPermission).toHaveBeenCalledWith(
      "a1",
      "perm-uuid-1",
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: userRoleAssignmentsQueryKey("u1"),
    });
  });

  it("does not invalidate when the mutation fails", async () => {
    const { wrapper, invalidateSpy } = createWrapper();
    vi.mocked(roleAssignmentsService.create).mockRejectedValue(new Error("403"));

    const { result } = renderHook(() => useCreateRoleAssignment(), { wrapper });
    result.current.mutate({
      userId: "u1",
      roleTemplateKey: "school_admin",
      scopeType: "school",
      scopeId: "s1",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
