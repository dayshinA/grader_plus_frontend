import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, configureApiClient, refreshSession } from "~/lib/api-client";

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function authHeaderFrom(requestInit: RequestInit | Request): string | null {
  const headers = new Headers(
    requestInit instanceof Request ? requestInit.headers : requestInit.headers,
  );
  return headers.get("Authorization");
}

function urlFrom(input: unknown): string {
  return input instanceof Request ? input.url : String(input);
}

const noopHandlers = {
  getToken: () => null,
  onUnauthorized: () => {},
  onTokenRefreshed: () => {},
};

describe("api client", () => {
  beforeEach(() => {
    configureApiClient(noopHandlers);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns unwrapped data on a successful envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            success: true,
            statusCode: 200,
            code: "SUCCESS",
            message: "ok",
            data: { id: "1" },
          },
          200,
        ),
      ),
    );

    const result = await api.get<{ id: string }>("/auth/login");

    expect(result).toEqual({ id: "1" });
  });

  it("throws ApiError on a failed envelope, branching on success not status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            success: false,
            statusCode: 401,
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          },
          200, // deliberately mismatched HTTP status to prove we branch on `success`
        ),
      ),
    );

    await expect(api.get("/auth/login")).rejects.toMatchObject(
      new ApiError({
        success: false,
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      }),
    );
  });

  it("does not fire the unauthorized callback on a 401 from an unauthenticated request (e.g. wrong-password login)", async () => {
    const onUnauthorized = vi.fn();
    configureApiClient({ ...noopHandlers, getToken: () => null, onUnauthorized });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            success: false,
            statusCode: 401,
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          },
          401,
        ),
      ),
    );

    await expect(api.post("/auth/login", { email: "x", password: "y" })).rejects.toThrow(
      ApiError,
    );

    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("attaches the Authorization header when a token is present", async () => {
    configureApiClient({ ...noopHandlers, getToken: () => "abc123" });
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(
          { success: true, statusCode: 200, code: "SUCCESS", message: "ok" },
          200,
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await api.get("/protected");

    const [urlOrRequest, requestInit] = fetchMock.mock.calls[0];
    expect(authHeaderFrom(requestInit ?? urlOrRequest)).toBe("Bearer abc123");
  });

  it("surfaces a network failure (no response) as an ApiError instead of throwing a raw error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(api.get("/auth/login")).rejects.toThrow(ApiError);
  });

  it("sends a JSON body on api.post", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(
          { success: true, statusCode: 201, code: "CREATED", message: "ok", data: { id: "2" } },
          201,
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await api.post<{ id: string }>("/auth/change-password", {
      currentPassword: "old",
      newPassword: "new",
    });

    expect(result).toEqual({ id: "2" });
    const [urlOrRequest, requestInit] = fetchMock.mock.calls[0];
    const init = requestInit ?? urlOrRequest;
    const body = init instanceof Request ? await init.clone().text() : (init as RequestInit).body;
    expect(JSON.parse(body as string)).toEqual({
      currentPassword: "old",
      newPassword: "new",
    });
  });

  describe("token refresh", () => {
    it("on a 401 with a token, refreshes once and retries the original request with the new token", async () => {
      let currentToken = "old-token";
      const onTokenRefreshed = vi.fn((session: { access_token: string }) => {
        currentToken = session.access_token;
      });
      configureApiClient({
        getToken: () => currentToken,
        onUnauthorized: vi.fn(),
        onTokenRefreshed,
      });

      let protectedCallCount = 0;
      const fetchMock = vi.fn((input: unknown) => {
        const url = urlFrom(input);
        if (url.includes("/auth/refresh")) {
          return Promise.resolve(
            jsonResponse(
              {
                success: true,
                statusCode: 200,
                code: "TOKEN_REFRESHED",
                message: "ok",
                data: { access_token: "new-token", expires_in: 3600, user: { id: "u1" } },
              },
              200,
            ),
          );
        }
        if (url.includes("/protected")) {
          protectedCallCount += 1;
          if (protectedCallCount === 1) {
            return Promise.resolve(
              jsonResponse(
                { success: false, statusCode: 401, code: "UNAUTHORIZED", message: "expired" },
                401,
              ),
            );
          }
          return Promise.resolve(
            jsonResponse(
              { success: true, statusCode: 200, code: "SUCCESS", message: "ok", data: { value: "ok" } },
              200,
            ),
          );
        }
        throw new Error(`unexpected fetch call: ${url}`);
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await api.get<{ value: string }>("/protected");

      expect(result).toEqual({ value: "ok" });
      expect(onTokenRefreshed).toHaveBeenCalledOnce();
      expect(protectedCallCount).toBe(2);

      const retryCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1] as [
        unknown,
        unknown?,
      ];
      expect(authHeaderFrom((retryCall[1] ?? retryCall[0]) as RequestInit | Request)).toBe(
        "Bearer new-token",
      );
    });

    it("calls onUnauthorized exactly once and rejects if the refresh attempt also fails", async () => {
      const onUnauthorized = vi.fn();
      configureApiClient({ getToken: () => "old-token", onUnauthorized, onTokenRefreshed: () => {} });

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(
            { success: false, statusCode: 401, code: "UNAUTHORIZED", message: "x" },
            401,
          ),
        ),
      );

      await expect(api.get("/protected")).rejects.toThrow(ApiError);

      expect(onUnauthorized).toHaveBeenCalledOnce();
    });

    it("dedupes concurrent refreshSession() calls into a single request (backend treats a race as token reuse)", async () => {
      configureApiClient(noopHandlers);
      let refreshCallCount = 0;
      vi.stubGlobal(
        "fetch",
        vi.fn((input: unknown) => {
          if (urlFrom(input).includes("/auth/refresh")) {
            refreshCallCount += 1;
          }
          return Promise.resolve(
            jsonResponse(
              {
                success: true,
                statusCode: 200,
                code: "TOKEN_REFRESHED",
                message: "ok",
                data: { access_token: "t2", expires_in: 3600, user: {} },
              },
              200,
            ),
          );
        }),
      );

      const [first, second] = await Promise.all([refreshSession(), refreshSession()]);

      expect(first).toBe(true);
      expect(second).toBe(true);
      expect(refreshCallCount).toBe(1);
    });

    it("refreshSession() resolves false (not a throw) when the refresh call fails", async () => {
      configureApiClient(noopHandlers);
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(
            { success: false, statusCode: 401, code: "UNAUTHORIZED", message: "Invalid or expired refresh token" },
            401,
          ),
        ),
      );

      await expect(refreshSession()).resolves.toBe(false);
    });
  });
});
