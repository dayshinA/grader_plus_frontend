import { beforeEach, describe, expect, it, vi } from "vitest";

import { annotationsService } from "~/features/grading/api/annotations.service";
import { evaluationsService } from "~/features/grading/api/evaluations.service";
import { markerRubricService } from "~/features/grading/api/marker-rubric.service";
import { markerDashboardService } from "~/features/dashboard/api/marker-dashboard.service";
import { api, apiWithMessage } from "~/lib/api-client";

vi.mock("~/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("~/lib/api-client")>("~/lib/api-client");
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
    apiWithMessage: { post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

const MODULE = "m1";
const STUDENT = "s1";
const SUBMISSION = "f1";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("markerDashboardService", () => {
  it("calls the cross-module route, with no module in the path", async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    await markerDashboardService.getMyDashboard();

    // Deliberately not nested under academic-modules/:moduleId — a marker's queue spans every
    // module they mark on, and the backend self-filters it to their own assignments.
    expect(api.get).toHaveBeenCalledWith("/markers/me/dashboard");
  });
});

describe("markerRubricService", () => {
  it("reads the rubric through the student-scoped, blind-guarded route", async () => {
    vi.mocked(api.get).mockResolvedValue({ criteria: [] });

    await markerRubricService.getForStudent(MODULE, STUDENT);

    // NOT `/academic-modules/m1/rubric` — that one needs `rubrics.view` at the module, which the
    // Marker template holds at no scope. Hitting it would 403 every marker.
    expect(api.get).toHaveBeenCalledWith("/academic-modules/m1/students/s1/rubric");
  });
});

describe("evaluationsService", () => {
  it("start posts to the collection route and goes through apiWithMessage", async () => {
    vi.mocked(apiWithMessage.post).mockResolvedValue({ data: {}, message: "Evaluation started." });

    await evaluationsService.start(MODULE, STUDENT);

    expect(apiWithMessage.post).toHaveBeenCalledWith(
      "/academic-modules/m1/students/s1/evaluations",
      {},
    );
  });

  it("start never sends a rubricId — the server resolves it from the module", async () => {
    vi.mocked(apiWithMessage.post).mockResolvedValue({ data: {}, message: "ok" });

    await evaluationsService.start(MODULE, STUDENT, { generalFeedback: "early note" });

    const [, body] = vi.mocked(apiWithMessage.post).mock.calls[0];
    expect(body).toEqual({ generalFeedback: "early note" });
    expect(body).not.toHaveProperty("rubricId");
  });

  it("getOwn reads the /me route, so there is no way to name another marker", async () => {
    vi.mocked(api.get).mockResolvedValue({});

    await evaluationsService.getOwn(MODULE, STUDENT);

    expect(api.get).toHaveBeenCalledWith(
      "/academic-modules/m1/students/s1/evaluations/me",
    );
  });

  it("update patches /me with only what changed", async () => {
    vi.mocked(apiWithMessage.patch).mockResolvedValue({ data: {}, message: "ok" });

    await evaluationsService.update(MODULE, STUDENT, { status: "final" });

    expect(apiWithMessage.patch).toHaveBeenCalledWith(
      "/academic-modules/m1/students/s1/evaluations/me",
      { status: "final" },
    );
  });

  it("saveScore PUTs one criterion and uses plain api, not apiWithMessage", async () => {
    vi.mocked(api.put).mockResolvedValue({});

    await evaluationsService.saveScore(MODULE, STUDENT, "c9", { score: 12, feedback: "solid" });

    expect(api.put).toHaveBeenCalledWith(
      "/academic-modules/m1/students/s1/evaluations/me/scores/c9",
      { score: 12, feedback: "solid" },
    );
    // It's an autosave on blur — routing it through apiWithMessage would toast on every field.
    expect(apiWithMessage.patch).not.toHaveBeenCalled();
    expect(apiWithMessage.post).not.toHaveBeenCalled();
  });
});

describe("annotationsService", () => {
  const path = "/academic-modules/m1/students/s1/submissions/f1/annotations";

  it("list reads the submission-nested route", async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    await annotationsService.list(MODULE, STUDENT, SUBMISSION);

    expect(api.get).toHaveBeenCalledWith(path);
  });

  it("create sends page fractions and never a markerId", async () => {
    vi.mocked(apiWithMessage.post).mockResolvedValue({ data: {}, message: "ok" });

    await annotationsService.create(MODULE, STUDENT, SUBMISSION, {
      pageNumber: 3,
      posX: 0.25,
      posY: 0.8,
      content: "Check this claim",
    });

    const [url, body] = vi.mocked(apiWithMessage.post).mock.calls[0];
    expect(url).toBe(path);
    expect(body).toEqual({
      pageNumber: 3,
      posX: 0.25,
      posY: 0.8,
      content: "Check this claim",
    });
    // Forced server-side from the caller's token. Sending one would be ignored at best.
    expect(body).not.toHaveProperty("markerId");
  });

  it("update patches by annotation id and sends no position", async () => {
    vi.mocked(apiWithMessage.patch).mockResolvedValue({ data: {}, message: "ok" });

    await annotationsService.update(MODULE, STUDENT, SUBMISSION, "a7", {
      content: "Reworded",
    });

    const [url, body] = vi.mocked(apiWithMessage.patch).mock.calls[0];
    expect(url).toBe(`${path}/a7`);
    // Position is immutable server-side — there is no reposition route, so a body carrying
    // posX/posY would silently do nothing and mislead whoever wrote it.
    expect(body).not.toHaveProperty("posX");
    expect(body).not.toHaveProperty("posY");
    expect(body).not.toHaveProperty("pageNumber");
  });

  it("remove deletes by annotation id", async () => {
    vi.mocked(apiWithMessage.delete).mockResolvedValue({ data: undefined, message: "ok" });

    await annotationsService.remove(MODULE, STUDENT, SUBMISSION, "a7");

    expect(apiWithMessage.delete).toHaveBeenCalledWith(`${path}/a7`);
  });
});
