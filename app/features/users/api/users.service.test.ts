import { describe, expect, it, vi } from "vitest";
import { usersService } from "~/features/users/api/users.service";
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

describe("usersService", () => {
  it("getUsers calls GET /users", async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    await usersService.getUsers();

    expect(api.get).toHaveBeenCalledWith("/users");
  });

  it("createUser calls POST /users with the request body and resolves { data, message }", async () => {
    const request = {
      email: "new@lboro.ac.uk",
      password: "password123",
      fullName: "New User",
      roleTemplateKey: "marker" as const,
      scopeType: "module" as const,
      scopeId: "module-1",
    };
    const created = {
      id: "u1",
      email: request.email,
      fullName: request.fullName,
      learnId: null,
      isActive: true,
      createdAt: "2026-07-09",
    };
    vi.mocked(apiWithMessage.post).mockResolvedValue({ data: created, message: "User created successfully." });

    const result = await usersService.createUser(request);

    expect(apiWithMessage.post).toHaveBeenCalledWith("/users", request);
    expect(result).toEqual({ data: created, message: "User created successfully." });
  });

  it("updateUser calls PATCH /users/:id with only the supplied fields and resolves { data, message }", async () => {
    vi.mocked(apiWithMessage.patch).mockResolvedValue({ data: {}, message: "User updated successfully." });

    const result = await usersService.updateUser("u1", { isActive: true });

    expect(apiWithMessage.patch).toHaveBeenCalledWith("/users/u1", { isActive: true });
    expect(result.message).toBe("User updated successfully.");
  });

  it("deactivateUser calls DELETE /users/:id and resolves { data, message }", async () => {
    vi.mocked(apiWithMessage.delete).mockResolvedValue({ data: { id: "u1" }, message: "User deactivated successfully." });

    const result = await usersService.deactivateUser("u1");

    expect(apiWithMessage.delete).toHaveBeenCalledWith("/users/u1");
    expect(result).toEqual({ data: { id: "u1" }, message: "User deactivated successfully." });
  });

  it("bulkImportUsers posts a FormData body containing the file under field name 'file'", async () => {
    const importResult = {
      totalRows: 1,
      createdCount: 1,
      errorCount: 0,
      results: [{ row: 2, email: "a@test.com", status: "created" as const, tempPassword: "Abc123!!" }],
    };
    vi.mocked(apiWithMessage.post).mockResolvedValue({ data: importResult, message: "1 row processed: 1 created, 0 failed." });
    const file = new File(
      ["email,fullName,roleTemplateKey,scopeType,scopeId\na@test.com,A,marker,module,module-1\n"],
      "users.csv",
      { type: "text/csv" },
    );
    const appendSpy = vi.spyOn(FormData.prototype, "append");

    const result = await usersService.bulkImportUsers(file);

    expect(apiWithMessage.post).toHaveBeenCalledWith("/users/bulk-import", expect.any(FormData));
    expect(appendSpy).toHaveBeenCalledWith("file", file);
    expect(result).toEqual({ data: importResult, message: "1 row processed: 1 created, 0 failed." });
  });
});
