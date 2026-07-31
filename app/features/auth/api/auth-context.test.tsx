import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "~/features/auth/api/auth-context";
import { api, resetSessionBootstrapForTests } from "~/lib/api-client";
import type { LoginResponse } from "~/features/auth/types";
import {
  envelope,
  makeAssignment,
  makeSummary,
  stubFetchWithSummary,
  unauthorizedResponse,
} from "~/features/permissions/test-support";

const sampleLogin: LoginResponse = {
  access_token: "token-123",
  expires_in: 3600,
  user: {
    id: "u1",
    email: "marker@lboro.ac.uk",
    fullName: "Marker One",
    mustChangePassword: false,
  },
};

const markerSummary = makeSummary(["marker"], {
  assignments: [
    makeAssignment("marker", { permissionKeys: ["evaluations.submit"] }),
  ],
});

const coordinatorSummary = makeSummary(["project_coordinator"], {
  assignments: [
    makeAssignment("project_coordinator", {
      scopeType: "module",
      scopeId: "cs301",
      permissionKeys: ["modules.view"],
    }),
  ],
});

function TestConsumer() {
  const { user, permissions, login, logout, markPasswordChanged } = useAuth();
  return (
    <div>
      <span data-testid="user-email">{user?.email ?? "none"}</span>
      <span data-testid="must-change">{String(user?.mustChangePassword)}</span>
      <span data-testid="roles">
        {permissions ? permissions.roleTemplateKeys.join(",") || "empty" : "none"}
      </span>
      <button onClick={() => void login(sampleLogin).catch(() => {})}>login</button>
      <button onClick={logout}>logout</button>
      <button onClick={markPasswordChanged}>clear-flag</button>
    </div>
  );
}

async function renderWithProviders(initialEntries: string[] = ["/"]) {
  const utils = render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Routes>
          <Route path="*" element={<TestConsumer />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  // Flush the mount-time silent-refresh attempt (POST /auth/refresh) and the
  // /role-assignments/me call that follows a successful one, so their state
  // updates land inside `act` instead of leaking into whatever runs next.
  await act(async () => {});
  return utils;
}

describe("AuthProvider / useAuth", () => {
  beforeEach(() => {
    // The bootstrap cache is per page load in production but per *module* in a
    // test file — without this reset only the first case here would ever run a
    // real POST /auth/refresh. See the function's own comment.
    resetSessionBootstrapForTests();
    // No session by default: the bootstrap refresh 401s, so /me is never
    // reached. Tests that log in explicitly get the summary from this stub.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(stubFetchWithSummary(markerSummary)),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts logged out with no permissions", async () => {
    await renderWithProviders();
    expect(screen.getByTestId("user-email").textContent).toBe("none");
    expect(screen.getByTestId("roles").textContent).toBe("none");
  });

  it("login populates the user and the permissions summary; logout clears both", async () => {
    await renderWithProviders();

    await act(async () => {
      screen.getByText("login").click();
    });
    expect(screen.getByTestId("user-email").textContent).toBe(
      "marker@lboro.ac.uk",
    );
    expect(screen.getByTestId("roles").textContent).toBe("marker");

    await act(async () => {
      screen.getByText("logout").click();
    });
    expect(screen.getByTestId("user-email").textContent).toBe("none");
    expect(screen.getByTestId("roles").textContent).toBe("none");
  });

  it("calls GET /role-assignments/me on login", async () => {
    await renderWithProviders();
    await act(async () => {
      screen.getByText("login").click();
    });

    const calls = vi.mocked(globalThis.fetch).mock.calls;
    const meCalls = calls.filter((call) =>
      String(
        typeof call[0] === "string" ? call[0] : (call[0] as Request)?.url ?? "",
      ).includes("/role-assignments/me"),
    );
    expect(meCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("a failed /role-assignments/me leaves the session torn down (decision #40)", async () => {
    // Without the summary no screen can be gated, so a half-authenticated
    // shell is worse than no session at all. login() rejects and clears.
    vi.stubGlobal("fetch", vi.fn().mockImplementation(stubFetchWithSummary(null)));
    await renderWithProviders();

    await act(async () => {
      screen.getByText("login").click();
    });

    expect(screen.getByTestId("user-email").textContent).toBe("none");
    expect(screen.getByTestId("roles").textContent).toBe("none");
  });

  it("recovers the session and the summary on mount when a refresh cookie is present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: unknown) => {
        const url = String(
          typeof input === "string" ? input : (input as Request)?.url ?? "",
        );
        if (url.includes("/auth/refresh")) {
          return Promise.resolve(
            envelope({
              access_token: "refreshed",
              expires_in: 3600,
              user: sampleLogin.user,
            }),
          );
        }
        if (url.includes("/role-assignments/me")) {
          return Promise.resolve(envelope(coordinatorSummary));
        }
        return Promise.resolve(unauthorizedResponse());
      }),
    );

    await renderWithProviders();

    // Two sequential round trips here — POST /auth/refresh, then the
    // GET /role-assignments/me it triggers — so this needs more than a single
    // microtask flush to settle.
    await waitFor(() => {
      expect(screen.getByTestId("user-email").textContent).toBe(
        "marker@lboro.ac.uk",
      );
    });
    expect(screen.getByTestId("roles").textContent).toBe("project_coordinator");
  });

  it("refetches the summary on a token refresh, picking up a mid-session role change", async () => {
    // The reason /me runs on every refresh and not just at login: a role can be
    // revoked mid-session and takes effect on the very next request, so a stale
    // cached summary shows nav items and buttons that 403 when used.
    await renderWithProviders();
    await act(async () => {
      screen.getByText("login").click();
    });
    expect(screen.getByTestId("roles").textContent).toBe("marker");

    // The session is refreshed and the role has changed server-side.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: unknown) => {
        const url = String(
          typeof input === "string" ? input : (input as Request)?.url ?? "",
        );
        if (url.includes("/auth/refresh")) {
          return Promise.resolve(
            envelope({
              access_token: "refreshed",
              expires_in: 3600,
              user: sampleLogin.user,
            }),
          );
        }
        if (url.includes("/role-assignments/me")) {
          return Promise.resolve(envelope(coordinatorSummary));
        }
        return Promise.resolve(unauthorizedResponse());
      }),
    );

    const { refreshSession } = await import("~/lib/api-client");
    await act(async () => {
      await refreshSession();
    });

    expect(screen.getByTestId("roles").textContent).toBe("project_coordinator");
  });

  it("markPasswordChanged flips mustChangePassword to false", async () => {
    await renderWithProviders();
    await act(async () => {
      screen.getByText("login").click();
    });

    await act(async () => {
      screen.getByText("clear-flag").click();
    });

    expect(screen.getByTestId("must-change").textContent).toBe("false");
  });

  it("registers itself with api-client so a 401 clears state via api.get (after a failed refresh attempt)", async () => {
    await renderWithProviders();
    await act(async () => {
      screen.getByText("login").click();
    });
    expect(screen.getByTestId("user-email").textContent).toBe(
      "marker@lboro.ac.uk",
    );

    // Every call (the protected route and the refresh attempt it triggers)
    // 401s from here on — simulates a fully dead session.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(unauthorizedResponse()));

    await act(async () => {
      await api.get("/some/protected/route").catch(() => {});
    });

    expect(screen.getByTestId("user-email").textContent).toBe("none");
    expect(screen.getByTestId("roles").textContent).toBe("none");
  });
});
