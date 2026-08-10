import { describe, expect, it, vi } from "vitest";

import { exportService } from "~/features/export/api/export.service";
import { api } from "~/lib/api-client";

vi.mock("~/lib/api-client", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  apiWithMessage: { post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe("exportService", () => {
  it("getGrades calls GET /academic-modules/:moduleId/grades", async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    await exportService.getGrades("m1");

    expect(api.get).toHaveBeenCalledWith("/academic-modules/m1/grades");
  });

  it("hits the JSON grades route, not the CSV export sibling", async () => {
    // The two live on the same controller and differ by one path segment; `/export` is gated on
    // `grades.export`, which no oversight tier holds, and returns raw text/csv rather than the
    // JSON envelope this client unwraps.
    vi.mocked(api.get).mockResolvedValue([]);

    await exportService.getGrades("m1");

    expect(vi.mocked(api.get).mock.calls[0][0]).not.toContain("/export");
  });
});
