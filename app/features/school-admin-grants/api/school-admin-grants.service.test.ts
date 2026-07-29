import { describe, expect, it, vi } from "vitest";
import { schoolAdminGrantsService } from "~/features/school-admin-grants/api/school-admin-grants.service";
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

describe("schoolAdminGrantsService", () => {
  it("getGrants calls GET /schools/:id/admin-grants with no query string", async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    await schoolAdminGrantsService.getGrants("s1");

    expect(api.get).toHaveBeenCalledWith("/schools/s1/admin-grants");
  });

  it("grantSchoolAdmin calls POST /schools/:id/admin-grants with the coordinatorId and resolves { data, message }", async () => {
    const grant = {
      schoolId: "s1",
      coordinatorId: "c1",
      isActive: true,
      grantedBy: "sa1",
      grantedAt: "2026-07-29T00:00:00.000Z",
      revokedBy: null,
      revokedAt: null,
    };
    vi.mocked(apiWithMessage.post).mockResolvedValue({
      data: grant,
      message: "School admin permission granted.",
    });

    const result = await schoolAdminGrantsService.grantSchoolAdmin("s1", { coordinatorId: "c1" });

    expect(apiWithMessage.post).toHaveBeenCalledWith("/schools/s1/admin-grants", {
      coordinatorId: "c1",
    });
    expect(result).toEqual({ data: grant, message: "School admin permission granted." });
  });

  it("revokeSchoolAdmin calls DELETE /schools/:id/admin-grants/:coordinatorId and resolves { data, message }", async () => {
    const grant = {
      schoolId: "s1",
      coordinatorId: "c1",
      isActive: false,
      grantedBy: "sa1",
      grantedAt: "2026-07-29T00:00:00.000Z",
      revokedBy: "sa1",
      revokedAt: "2026-07-30T00:00:00.000Z",
    };
    vi.mocked(apiWithMessage.delete).mockResolvedValue({
      data: grant,
      message: "School admin permission revoked.",
    });

    const result = await schoolAdminGrantsService.revokeSchoolAdmin("s1", "c1");

    expect(apiWithMessage.delete).toHaveBeenCalledWith("/schools/s1/admin-grants/c1");
    expect(result).toEqual({ data: grant, message: "School admin permission revoked." });
  });
});
