import { beforeEach, describe, expect, it, vi } from "vitest";

import { exportService } from "~/features/export/api/export.service";
import { api } from "~/lib/api-client";

vi.mock("~/lib/api-client", () => ({
  api: { get: vi.fn(), getRaw: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  apiWithMessage: { post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe("exportService", () => {
  // Call history accumulates across cases in a file otherwise, which breaks the
  // "this call went through X and never Y" assertions below.
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it("exportGradesCsv hits the raw /export route with no query when unfiltered", async () => {
    vi.mocked(api.getRaw).mockResolvedValue({ data: "csv", filename: null });

    await exportService.exportGradesCsv("m1");

    expect(api.getRaw).toHaveBeenCalledWith("/academic-modules/m1/export");
  });

  it("exportGradesCsv goes through getRaw, never get — the route skips the JSON envelope", async () => {
    vi.mocked(api.getRaw).mockResolvedValue({ data: "csv", filename: null });

    await exportService.exportGradesCsv("m1");

    // Routed through `api.get`, the CSV body's missing `success` field reads as a failed
    // envelope and a valid export throws.
    expect(api.get).not.toHaveBeenCalled();
  });

  it("exportGradesCsv appends includeFeedback only when asked", async () => {
    vi.mocked(api.getRaw).mockResolvedValue({ data: "csv", filename: null });

    await exportService.exportGradesCsv("m1", { includeFeedback: true });
    expect(api.getRaw).toHaveBeenCalledWith(
      "/academic-modules/m1/export?includeFeedback=true",
    );

    await exportService.exportGradesCsv("m1", { includeFeedback: false });
    expect(api.getRaw).toHaveBeenLastCalledWith("/academic-modules/m1/export");
  });

  it("exportGradesCsv comma-separates studentIds, and omits the param for an empty list", async () => {
    vi.mocked(api.getRaw).mockResolvedValue({ data: "csv", filename: null });

    await exportService.exportGradesCsv("m1", { studentIds: ["a", "b"] });
    expect(api.getRaw).toHaveBeenCalledWith(
      "/academic-modules/m1/export?studentIds=a%2Cb",
    );

    await exportService.exportGradesCsv("m1", { studentIds: [] });
    expect(api.getRaw).toHaveBeenLastCalledWith("/academic-modules/m1/export");
  });
});
