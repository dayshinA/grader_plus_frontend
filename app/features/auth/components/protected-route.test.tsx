import { act, render, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "~/features/auth/api/auth-context";
import { ProtectedRoute } from "~/features/auth/components/protected-route";
import type { LoginResponse } from "~/features/auth/types";

function makeUser(overrides: Partial<LoginResponse["user"]> = {}): LoginResponse {
  return {
    access_token: "t",
    expires_in: 3600,
    user: {
      id: "u1",
      email: "a@lboro.ac.uk",
      fullName: "A",
      role: "marker",
      mustChangePassword: false,
      ...overrides,
    },
  };
}

function LoginPage() {
  return <div>login page</div>;
}
function ChangePasswordPage() {
  return <div>change password page</div>;
}
function UnauthorizedPage() {
  return <div>unauthorized page</div>;
}
function MarkerHome() {
  return <div>marker home</div>;
}

function SetupPage({ response }: { response: LoginResponse }) {
  const { login } = useAuth();
  return (
    <div>
      <button onClick={() => login(response)}>do-login</button>
      <Link to="/marker/projects">go-to-marker</Link>
    </div>
  );
}

function TestApp({
  initialEntries,
  allowedRoles,
  loginResponse,
}: {
  initialEntries: string[];
  allowedRoles?: ("coordinator" | "marker" | "super_admin")[];
  loginResponse?: LoginResponse;
}) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          {loginResponse && (
            <Route path="/setup" element={<SetupPage response={loginResponse} />} />
          )}
          <Route
            element={<ProtectedRoute allowedRoles={allowedRoles} />}
          >
            <Route path="/marker/projects" element={<MarkerHome />} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    // No session by default — the mount-time bootstrap refresh (see
    // auth-context.tsx) should fail quietly so isBootstrapping settles fast.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            statusCode: 401,
            code: "UNAUTHORIZED",
            message: "Invalid or expired refresh token",
          }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to /login with next+expired when logged out", async () => {
    render(<TestApp initialEntries={["/marker/projects"]} />);
    await waitFor(() => {
      expect(screen.getByText("login page")).toBeInTheDocument();
    });
  });

  it("renders the protected content when authenticated", async () => {
    const response = makeUser();
    render(<TestApp initialEntries={["/setup"]} loginResponse={response} />);

    await act(async () => {
      screen.getByText("do-login").click();
    });
    await act(async () => {
      screen.getByText("go-to-marker").click();
    });

    expect(screen.getByText("marker home")).toBeInTheDocument();
  });

  it("forces /change-password when mustChangePassword is true", async () => {
    const response = makeUser({ mustChangePassword: true });
    render(<TestApp initialEntries={["/setup"]} loginResponse={response} />);

    await act(async () => {
      screen.getByText("do-login").click();
    });
    await act(async () => {
      screen.getByText("go-to-marker").click();
    });

    expect(screen.getByText("change password page")).toBeInTheDocument();
  });

  it("redirects to /unauthorized on role mismatch", async () => {
    const response = makeUser({ role: "coordinator" });
    render(
      <TestApp
        initialEntries={["/setup"]}
        allowedRoles={["marker"]}
        loginResponse={response}
      />,
    );

    await act(async () => {
      screen.getByText("do-login").click();
    });
    await act(async () => {
      screen.getByText("go-to-marker").click();
    });

    expect(screen.getByText("unauthorized page")).toBeInTheDocument();
  });
});
