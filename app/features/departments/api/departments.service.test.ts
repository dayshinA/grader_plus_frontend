import { describe, expect, it, vi } from "vitest";
import { departmentsService } from "~/features/departments/api/departments.service";
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

describe("departmentsService", () => {
  it("getDepartments calls GET /departments", async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    await departmentsService.getDepartments();

    expect(api.get).toHaveBeenCalledWith("/departments");
  });

  it("createDepartment calls POST /departments with the request body and resolves { data, message }", async () => {
    const request = { code: "SCI", name: "School of Science" };
    const created = { id: "d1", ...request, isActive: true, createdAt: "2026-07-11" };
    vi.mocked(apiWithMessage.post).mockResolvedValue({
      data: created,
      message: "Department created successfully.",
    });

    const result = await departmentsService.createDepartment(request);

    expect(apiWithMessage.post).toHaveBeenCalledWith("/departments", request);
    expect(result).toEqual({ data: created, message: "Department created successfully." });
  });

  it("updateDepartment calls PATCH /departments/:id with only the supplied fields and resolves { data, message }", async () => {
    vi.mocked(apiWithMessage.patch).mockResolvedValue({
      data: {},
      message: "Department updated successfully.",
    });

    const result = await departmentsService.updateDepartment("d1", { isActive: true });

    expect(apiWithMessage.patch).toHaveBeenCalledWith("/departments/d1", { isActive: true });
    expect(result.message).toBe("Department updated successfully.");
  });

  it("deactivateDepartment calls DELETE /departments/:id and resolves { data, message }", async () => {
    vi.mocked(apiWithMessage.delete).mockResolvedValue({
      data: { id: "d1" },
      message: "Department deactivated successfully.",
    });

    const result = await departmentsService.deactivateDepartment("d1");

    expect(apiWithMessage.delete).toHaveBeenCalledWith("/departments/d1");
    expect(result).toEqual({ data: { id: "d1" }, message: "Department deactivated successfully." });
  });
});
