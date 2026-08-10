import { describe, expect, it, vi } from "vitest";

import { rubricsService } from "~/features/rubrics/api/rubrics.service";
import { rubricDeleteBlockedMessage } from "~/features/rubrics/api/use-rubric-mutations";
import { isRubricMissing } from "~/features/rubrics/api/use-rubric";
import { ApiError, api, apiWithMessage } from "~/lib/api-client";

vi.mock("~/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("~/lib/api-client")>("~/lib/api-client");
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
    apiWithMessage: { post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

describe("rubricsService", () => {
  it("getRubric calls GET /academic-modules/:moduleId/rubric", async () => {
    vi.mocked(api.get).mockResolvedValue({ id: "r1", criteria: [] });

    await rubricsService.getRubric("m1");

    expect(api.get).toHaveBeenCalledWith("/academic-modules/m1/rubric");
  });

  // Every write goes through apiWithMessage rather than api, so the backend's own confirmation
  // survives to the toast (decision #31). A regression to plain `api` would lose that silently.
  it("createRubric POSTs the title to the rubric route", async () => {
    vi.mocked(apiWithMessage.post).mockResolvedValue({ data: {}, message: "ok" });

    await rubricsService.createRubric("m1", { title: "MSc Dissertation" });

    expect(apiWithMessage.post).toHaveBeenCalledWith("/academic-modules/m1/rubric", {
      title: "MSc Dissertation",
    });
  });

  it("updateRubric PATCHes the rubric route", async () => {
    vi.mocked(apiWithMessage.patch).mockResolvedValue({ data: {}, message: "ok" });

    await rubricsService.updateRubric("m1", { title: "Renamed" });

    expect(apiWithMessage.patch).toHaveBeenCalledWith("/academic-modules/m1/rubric", {
      title: "Renamed",
    });
  });

  it("deleteRubric DELETEs the rubric route", async () => {
    vi.mocked(apiWithMessage.delete).mockResolvedValue({ data: {}, message: "ok" });

    await rubricsService.deleteRubric("m1");

    expect(apiWithMessage.delete).toHaveBeenCalledWith("/academic-modules/m1/rubric");
  });

  it("createCriterion POSTs to the criteria sub-route without a displayOrder", async () => {
    vi.mocked(apiWithMessage.post).mockResolvedValue({ data: {}, message: "ok" });

    const request = {
      label: "Critical analysis",
      description: "Depth of argument",
      weighting: 40,
      maxScore: 100,
    };
    await rubricsService.createCriterion("m1", request);

    expect(apiWithMessage.post).toHaveBeenCalledWith(
      "/academic-modules/m1/rubric/criteria",
      request,
    );
    // displayOrder is deliberately never sent — the backend auto-assigns MAX+1, and guessing a
    // value here would silently reorder the list markers see.
    const [, body] = vi.mocked(apiWithMessage.post).mock.calls.at(-1)!;
    expect(body).not.toHaveProperty("displayOrder");
  });

  it("updateCriterion PATCHes the individual criterion", async () => {
    vi.mocked(apiWithMessage.patch).mockResolvedValue({ data: {}, message: "ok" });

    await rubricsService.updateCriterion("m1", "c9", { weighting: 25 });

    expect(apiWithMessage.patch).toHaveBeenCalledWith(
      "/academic-modules/m1/rubric/criteria/c9",
      { weighting: 25 },
    );
  });

  it("deleteCriterion DELETEs the individual criterion", async () => {
    vi.mocked(apiWithMessage.delete).mockResolvedValue({ data: {}, message: "ok" });

    await rubricsService.deleteCriterion("m1", "c9");

    expect(apiWithMessage.delete).toHaveBeenCalledWith(
      "/academic-modules/m1/rubric/criteria/c9",
    );
  });
});

describe("rubricDeleteBlockedMessage", () => {
  function apiError(statusCode: number, code: string): ApiError {
    return new ApiError({ success: false, statusCode, code, message: code });
  }

  it("explains RUBRIC_IN_USE in terms of what a coordinator can still do", () => {
    const message = rubricDeleteBlockedMessage(apiError(422, "RUBRIC_IN_USE"));
    expect(message).toContain("already started evaluations");
  });

  it("explains RUBRIC_CRITERION_IN_USE separately", () => {
    const message = rubricDeleteBlockedMessage(apiError(422, "RUBRIC_CRITERION_IN_USE"));
    expect(message).toContain("already scored this criterion");
  });

  it("returns null for any other API error, so the caller falls back to its own message", () => {
    expect(rubricDeleteBlockedMessage(apiError(500, "INTERNAL_ERROR"))).toBeNull();
  });

  it("returns null for a non-API error", () => {
    expect(rubricDeleteBlockedMessage(new Error("network down"))).toBeNull();
  });
});

describe("isRubricMissing", () => {
  function apiError(statusCode: number, code: string): ApiError {
    return new ApiError({ success: false, statusCode, code, message: code });
  }

  it("is true for the backend's RUBRIC_NOT_FOUND — a module whose rubric isn't built yet", () => {
    expect(isRubricMissing(apiError(404, "RUBRIC_NOT_FOUND"))).toBe(true);
  });

  it("is false for a module that doesn't exist, which is a real failure", () => {
    expect(isRubricMissing(apiError(404, "MODULE_NOT_FOUND"))).toBe(false);
  });

  it("is false for a 403 — handled separately by is403", () => {
    expect(isRubricMissing(apiError(403, "FORBIDDEN"))).toBe(false);
  });

  it("is false for a non-API error", () => {
    expect(isRubricMissing(new Error("network down"))).toBe(false);
  });
});
