import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "~/features/auth/api/auth-context";
import { api } from "~/lib/api-client";
import type { LoginResponse } from "~/features/auth/types";

const sampleLogin: LoginResponse = {
  access_token: "token-123",
  expires_in: 3600,
  user: {
    id: "u1",
    email: "marker@lboro.ac.uk",
    fullName: "Marker One",
    role: "marker",
    mustChangePassword: false,
  },
};

function noSessionResponse() {
  return new Response(
    JSON.stringify({
      success: false,
      statusCode: 401,
      code: "UNAUTHORIZED",
      message: "Invalid or expired refresh token",
    }),
    { status: 401, headers: { "Content-Type": "application/json" } },
  );
}

function TestConsumer() {
  const { user, login, logout, markPasswordChanged } = useAuth();
  return (
    <div>
      <span data-testid="user-email">{user?.email ?? "none"}</span>
      <span data-testid="must-change">{String(user?.mustChangePassword)}</span>
      <button onClick={() => login(sampleLogin)}>login</button>
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
  // Flush the mount-time silent-refresh attempt (POST /auth/refresh) so its
  // state update lands inside `act` instead of leaking into whatever runs
  // next.
  await act(async () => {});
  return utils;
}

describe("AuthProvider / useAuth", () => {
  beforeEach(() => {
    // No session by default — the mount-time bootstrap refresh should
    // fail quietly (see auth-context.tsx) unless a test overrides this.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(noSessionResponse()));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts logged out", async () => {
    await renderWithProviders();
    expect(screen.getByTestId("user-email").textContent).toBe("none");
  });

  it("login populates the user and logout clears it", async () => {
    await renderWithProviders();

    await act(async () => {
      screen.getByText("login").click();
    });
    expect(screen.getByTestId("user-email").textContent).toBe(
      "marker@lboro.ac.uk",
    );

    await act(async () => {
      screen.getByText("logout").click();
    });
    expect(screen.getByTestId("user-email").textContent).toBe("none");
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
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(noSessionResponse()));

    await act(async () => {
      await api.get("/some/protected/route").catch(() => {});
    });

    expect(screen.getByTestId("user-email").textContent).toBe("none");
  });
});
