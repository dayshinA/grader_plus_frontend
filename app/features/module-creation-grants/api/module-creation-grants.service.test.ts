import { describe, expect, it, vi } from "vitest";
import { moduleCreationGrantsService } from "~/features/module-creation-grants/api/module-creation-grants.service";
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

describe("moduleCreationGrantsService", () => {
  it("getGrants calls GET /departments/:id/module-creation-grants with no query string", async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    await moduleCreationGrantsService.getGrants("d1");

    expect(api.get).toHaveBeenCalledWith("/departments/d1/module-creation-grants");
  });

  it("grantModuleCreation calls POST /departments/:id/module-creation-grants with the coordinatorId and resolves { data, message }", async () => {
    const grant = {
      departmentId: "d1",
      coordinatorId: "c1",
      isActive: true,
      grantedBy: "sa1",
      grantedAt: "2026-07-20T00:00:00.000Z",
      revokedBy: null,
      revokedAt: null,
    };
    vi.mocked(apiWithMessage.post).mockResolvedValue({
      data: grant,
      message: "Module creation permission granted.",
    });

    const result = await moduleCreationGrantsService.grantModuleCreation("d1", {
      coordinatorId: "c1",
    });

    expect(apiWithMessage.post).toHaveBeenCalledWith("/departments/d1/module-creation-grants", {
      coordinatorId: "c1",
    });
    expect(result).toEqual({ data: grant, message: "Module creation permission granted." });
  });

  it("revokeModuleCreation calls DELETE /departments/:id/module-creation-grants/:coordinatorId and resolves { data, message }", async () => {
    const grant = {
      departmentId: "d1",
      coordinatorId: "c1",
      isActive: false,
      grantedBy: "sa1",
      grantedAt: "2026-07-20T00:00:00.000Z",
      revokedBy: "sa1",
      revokedAt: "2026-07-21T00:00:00.000Z",
    };
    vi.mocked(apiWithMessage.delete).mockResolvedValue({
      data: grant,
      message: "Module creation permission revoked.",
    });

    const result = await moduleCreationGrantsService.revokeModuleCreation("d1", "c1");

    expect(apiWithMessage.delete).toHaveBeenCalledWith(
      "/departments/d1/module-creation-grants/c1",
    );
    expect(result).toEqual({ data: grant, message: "Module creation permission revoked." });
  });
});
