import { describe, expect, it, vi } from "vitest";

import { markerAssignmentsService } from "~/features/marker-assignments/api/marker-assignments.service";
import { api, apiWithMessage } from "~/lib/api-client";

vi.mock("~/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("~/lib/api-client")>("~/lib/api-client");
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
    apiWithMessage: { post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

describe("markerAssignmentsService", () => {
  it("getCandidates calls the marker-candidates route", async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    await markerAssignmentsService.getCandidates("m1");

    expect(api.get).toHaveBeenCalledWith("/academic-modules/m1/marker-candidates");
  });

  it("getAssignments fetches the whole module in one call, with no studentId filter", async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    await markerAssignmentsService.getAssignments("m1");

    // The endpoint supports ?studentId=, deliberately unused: there's no pagination anywhere in
    // this API, so one fetch returns everything and the screen groups it client-side.
    expect(api.get).toHaveBeenCalledWith("/academic-modules/m1/marker-assignments");
  });

  it("assign posts to the student-nested route with the marker and role", async () => {
    vi.mocked(apiWithMessage.post).mockResolvedValue({ data: {}, message: "ok" });

    await markerAssignmentsService.assign("m1", "s1", {
      markerId: "u9",
      assignmentRole: "moderator",
    });

    expect(apiWithMessage.post).toHaveBeenCalledWith(
      "/academic-modules/m1/students/s1/marker-assignments",
      { markerId: "u9", assignmentRole: "moderator" },
    );
  });

  it("unassign deletes by assignment id, not by student or marker", async () => {
    vi.mocked(apiWithMessage.delete).mockResolvedValue({ data: {}, message: "ok" });

    await markerAssignmentsService.unassign("m1", "a5");

    expect(apiWithMessage.delete).toHaveBeenCalledWith(
      "/academic-modules/m1/marker-assignments/a5",
    );
  });

  it("bulkAssign posts multipart FormData to the bulk-upload route", async () => {
    vi.mocked(apiWithMessage.post).mockResolvedValue({ data: {}, message: "ok" });
    const file = new File(["studentId,markerEmail"], "assignments.csv");

    await markerAssignmentsService.bulkAssign("m1", file);

    const [url, body, config] = vi.mocked(apiWithMessage.post).mock.calls.at(-1)!;
    expect(url).toBe("/academic-modules/m1/marker-assignments/bulk-upload");
    expect((body as FormData).get("file")).toBe(file);
    expect(config).toBeUndefined();
  });
});
