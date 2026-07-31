import { describe, expect, it, vi } from "vitest";
import { roleAssignmentsService } from "~/features/role-assignments/api/role-assignments.service";
import { api, apiWithMessage } from "~/lib/api-client";

vi.mock("~/lib/api-client", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  apiWithMessage: { post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe("roleAssignmentsService", () => {
  it("listForUser calls GET /role-assignments with userId as a query param", async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    await roleAssignmentsService.listForUser("u1");

    expect(api.get).toHaveBeenCalledWith("/role-assignments", {
      params: { userId: "u1" },
    });
  });

  it("listForUser uses plain `api`, not apiWithMessage — it's a read (decision #31)", async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    await roleAssignmentsService.listForUser("u1");

    expect(apiWithMessage.post).not.toHaveBeenCalled();
  });

  it("create POSTs the body verbatim and resolves { data, message }", async () => {
    const body = {
      userId: "u1",
      roleTemplateKey: "department_admin" as const,
      scopeType: "department" as const,
      scopeId: "d1",
    };
    vi.mocked(apiWithMessage.post).mockResolvedValue({
      data: { id: "a1" },
      message: "Role assignment created.",
    });

    const result = await roleAssignmentsService.create(body);

    expect(apiWithMessage.post).toHaveBeenCalledWith("/role-assignments", body);
    expect(result).toEqual({ data: { id: "a1" }, message: "Role assignment created." });
  });

  it("create passes extraPermissionKeys through when supplied", async () => {
    vi.mocked(apiWithMessage.post).mockResolvedValue({ data: {}, message: "" });

    await roleAssignmentsService.create({
      userId: "u1",
      roleTemplateKey: "marker",
      scopeType: "global",
      extraPermissionKeys: ["grades.export"],
    });

    expect(apiWithMessage.post).toHaveBeenCalledWith("/role-assignments", {
      userId: "u1",
      roleTemplateKey: "marker",
      scopeType: "global",
      extraPermissionKeys: ["grades.export"],
    });
  });

  it("revoke calls DELETE /role-assignments/:id", async () => {
    vi.mocked(apiWithMessage.delete).mockResolvedValue({
      data: { id: "a1" },
      message: "Role assignment revoked.",
    });

    const result = await roleAssignmentsService.revoke("a1");

    expect(apiWithMessage.delete).toHaveBeenCalledWith("/role-assignments/a1");
    expect(result.message).toBe("Role assignment revoked.");
  });

  it("grantExtraPermission POSTs { permissionKey } to the assignment's permissions route", async () => {
    vi.mocked(apiWithMessage.post).mockResolvedValue({ data: {}, message: "" });

    await roleAssignmentsService.grantExtraPermission("a1", "grades.export");

    expect(apiWithMessage.post).toHaveBeenCalledWith(
      "/role-assignments/a1/permissions",
      { permissionKey: "grades.export" },
    );
  });

  it("revokeExtraPermission addresses the permission by id, not by key", async () => {
    // Regression guard: the route uses a ParseUUIDPipe, but the assignment
    // detail only carries permission *keys* — passing a key here would 400.
    vi.mocked(apiWithMessage.delete).mockResolvedValue({ data: {}, message: "" });

    await roleAssignmentsService.revokeExtraPermission("a1", "perm-uuid-1");

    expect(apiWithMessage.delete).toHaveBeenCalledWith(
      "/role-assignments/a1/permissions/perm-uuid-1",
    );
  });
});
