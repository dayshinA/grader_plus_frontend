import { describe, expect, it, vi } from "vitest";
import { departmentAdminGrantsService } from "~/features/department-admin-grants/api/department-admin-grants.service";
import { api, apiWithMessage } from "~/lib/api-client";

vi.mock("~/lib/api-client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  apiWithMessage: {
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("departmentAdminGrantsService", () => {
  it("getGrants calls GET /departments/:id/admin-grants with no query string", async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    await departmentAdminGrantsService.getGrants("d1");

    expect(api.get).toHaveBeenCalledWith("/departments/d1/admin-grants");
  });

  it("grantDepartmentAdmin calls POST /departments/:id/admin-grants with the coordinatorId and resolves { data, message }", async () => {
    const grant = {
      departmentId: "d1",
      coordinatorId: "c1",
      isActive: true,
      grantedBy: "sa1",
      grantedAt: "2026-07-11T00:00:00.000Z",
      revokedBy: null,
      revokedAt: null,
    };
    vi.mocked(apiWithMessage.post).mockResolvedValue({
      data: grant,
      message: "Department Admin granted successfully.",
    });

    const result = await departmentAdminGrantsService.grantDepartmentAdmin("d1", {
      coordinatorId: "c1",
    });

    expect(apiWithMessage.post).toHaveBeenCalledWith("/departments/d1/admin-grants", {
      coordinatorId: "c1",
    });
    expect(result).toEqual({ data: grant, message: "Department Admin granted successfully." });
  });

  it("revokeDepartmentAdmin calls DELETE /departments/:id/admin-grants/:coordinatorId and resolves { data, message }", async () => {
    const grant = {
      departmentId: "d1",
      coordinatorId: "c1",
      isActive: false,
      grantedBy: "sa1",
      grantedAt: "2026-07-11T00:00:00.000Z",
      revokedBy: "sa1",
      revokedAt: "2026-07-12T00:00:00.000Z",
    };
    vi.mocked(apiWithMessage.delete).mockResolvedValue({
      data: grant,
      message: "Department Admin revoked successfully.",
    });

    const result = await departmentAdminGrantsService.revokeDepartmentAdmin("d1", "c1");

    expect(apiWithMessage.delete).toHaveBeenCalledWith("/departments/d1/admin-grants/c1");
    expect(result).toEqual({ data: grant, message: "Department Admin revoked successfully." });
  });
});
