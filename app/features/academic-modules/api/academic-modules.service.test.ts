import { describe, expect, it, vi } from "vitest";
import { academicModulesService } from "~/features/academic-modules/api/academic-modules.service";
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

describe("academicModulesService", () => {
  it("getModules calls GET /academic-modules", async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    await academicModulesService.getModules();

    expect(api.get).toHaveBeenCalledWith("/academic-modules");
  });

  it("createModule calls POST /academic-modules with the request body and resolves { data, message }", async () => {
    const request = {
      code: "COMP101",
      name: "Intro to Computing",
      departmentId: "d1",
      discrepancyThreshold: 10,
      markingDeadline: "2026-08-01",
    };
    vi.mocked(apiWithMessage.post).mockResolvedValue({
      data: module1,
      message: "Module created successfully.",
    });

    const result = await academicModulesService.createModule(request);

    expect(apiWithMessage.post).toHaveBeenCalledWith("/academic-modules", request);
    expect(result).toEqual({ data: module1, message: "Module created successfully." });
  });

  it("updateModule calls PATCH /academic-modules/:id with only the supplied fields and resolves { data, message }", async () => {
    vi.mocked(apiWithMessage.patch).mockResolvedValue({
      data: { ...module1, isActive: true },
      message: "Module updated successfully.",
    });

    const result = await academicModulesService.updateModule("m1", { isActive: true });

    expect(apiWithMessage.patch).toHaveBeenCalledWith("/academic-modules/m1", { isActive: true });
    expect(result.message).toBe("Module updated successfully.");
  });

  it("deactivateModule calls DELETE /academic-modules/:id and resolves { data, message }", async () => {
    vi.mocked(apiWithMessage.delete).mockResolvedValue({
      data: { id: "m1" },
      message: "Module deactivated successfully.",
    });

    const result = await academicModulesService.deactivateModule("m1");

    expect(apiWithMessage.delete).toHaveBeenCalledWith("/academic-modules/m1");
    expect(result).toEqual({ data: { id: "m1" }, message: "Module deactivated successfully." });
  });
});
