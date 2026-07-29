import { describe, expect, it, vi } from "vitest";
import { schoolsService } from "~/features/schools/api/schools.service";
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

describe("schoolsService", () => {
  it("getSchools calls GET /schools", async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    await schoolsService.getSchools();

    expect(api.get).toHaveBeenCalledWith("/schools");
  });

  it("getCoordinators calls GET /schools/:id/coordinators", async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    await schoolsService.getCoordinators("s1");

    expect(api.get).toHaveBeenCalledWith("/schools/s1/coordinators");
  });

  it("createSchool calls POST /schools with the request body and resolves { data, message }", async () => {
    const request = { code: "SCI", name: "School of Science" };
    const created = { id: "s1", ...request, isActive: true, createdAt: "2026-07-29" };
    vi.mocked(apiWithMessage.post).mockResolvedValue({
      data: created,
      message: "School created successfully.",
    });

    const result = await schoolsService.createSchool(request);

    expect(apiWithMessage.post).toHaveBeenCalledWith("/schools", request);
    expect(result).toEqual({ data: created, message: "School created successfully." });
  });

  it("updateSchool calls PATCH /schools/:id with only the supplied fields and resolves { data, message }", async () => {
    vi.mocked(apiWithMessage.patch).mockResolvedValue({
      data: {},
      message: "School updated successfully.",
    });

    const result = await schoolsService.updateSchool("s1", { isActive: true });

    expect(apiWithMessage.patch).toHaveBeenCalledWith("/schools/s1", { isActive: true });
    expect(result.message).toBe("School updated successfully.");
  });

  it("deactivateSchool calls DELETE /schools/:id and resolves { data, message }", async () => {
    vi.mocked(apiWithMessage.delete).mockResolvedValue({
      data: { id: "s1" },
      message: "School deactivated successfully.",
    });

    const result = await schoolsService.deactivateSchool("s1");

    expect(apiWithMessage.delete).toHaveBeenCalledWith("/schools/s1");
    expect(result).toEqual({ data: { id: "s1" }, message: "School deactivated successfully." });
  });
});
