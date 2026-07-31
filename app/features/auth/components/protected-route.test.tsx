import { act, render, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "~/features/auth/api/auth-context";
import { ProtectedRoute } from "~/features/auth/components/protected-route";
import type { LoginResponse } from "~/features/auth/types";
import { resetSessionBootstrapForTests } from "~/lib/api-client";
import {
  makeAssignment,
  makeSummary,
  stubFetchWithSummary,
  unauthorizedResponse,
} from "~/features/permissions/test-support";
import type {
  PermissionKey,
  RoleTemplateKey,
  UserPermissionsSummary,
} from "~/features/permissions/types";

function makeUser(
  overrides: Partial<LoginResponse["user"]> = {},
): LoginResponse {
  return {
    access_token: "t",
    expires_in: 3600,
    user: {
      id: "u1",
      email: "a@lboro.ac.uk",
      fullName: "A",
      mustChangePassword: false,
      ...overrides,
    },
  };
}

/** A marker holding `evaluations.submit` — the default caller for these tests. */
const markerSummary = makeSummary(["marker"], {
  assignments: [
    makeAssignment("marker", {
      permissionKeys: ["evaluations.submit", "annotations.manage"],
    }),
  ],
});

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
      {/* login() rejects when /role-assignments/me fails (decision #40) — the
          catch keeps that path from surfacing as an unhandled rejection. */}
      <button onClick={() => void login(response).catch(() => {})}>do-login</button>
      <Link to="/marker/projects">go-to-marker</Link>
    </div>
  );
}

function TestApp({
  initialEntries,
  requireRoles,
  requirePermissions,
  loginResponse,
}: {
  initialEntries: string[];
  requireRoles?: RoleTemplateKey[];
  requirePermissions?: PermissionKey[];
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
            element={
              <ProtectedRoute
                requireRoles={requireRoles}
                requirePermissions={requirePermissions}
              />
            }
          >
            <Route path="/marker/projects" element={<MarkerHome />} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

/** Log in, then navigate into the protected route. */
async function loginAndVisit() {
  await act(async () => {
    screen.getByText("do-login").click();
  });
  await act(async () => {
    screen.getByText("go-to-marker").click();
  });
}

describe("ProtectedRoute", () => {
  function stub(summary: UserPermissionsSummary | null) {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(stubFetchWithSummary(summary)));
  }

  beforeEach(() => {
    resetSessionBootstrapForTests();
    // No session by default — the mount-time bootstrap refresh (see
    // auth-context.tsx) fails quietly so isBootstrapping settles fast.
    stub(markerSummary);
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
    render(<TestApp initialEntries={["/setup"]} loginResponse={makeUser()} />);
    await loginAndVisit();
    expect(screen.getByText("marker home")).toBeInTheDocument();
  });

  it("forces /change-password when mustChangePassword is true", async () => {
    render(
      <TestApp
        initialEntries={["/setup"]}
        loginResponse={makeUser({ mustChangePassword: true })}
      />,
    );
    await loginAndVisit();
    expect(screen.getByText("change password page")).toBeInTheDocument();
  });

  describe("requireRoles", () => {
    it("renders when the user holds the required role", async () => {
      render(
        <TestApp
          initialEntries={["/setup"]}
          requireRoles={["marker"]}
          loginResponse={makeUser()}
        />,
      );
      await loginAndVisit();
      expect(screen.getByText("marker home")).toBeInTheDocument();
    });

    it("redirects to /unauthorized when it doesn't", async () => {
      render(
        <TestApp
          initialEntries={["/setup"]}
          requireRoles={["super_admin"]}
          loginResponse={makeUser()}
        />,
      );
      await loginAndVisit();
      expect(screen.getByText("unauthorized page")).toBeInTheDocument();
    });

    it("is any-of — holding one listed role is enough", async () => {
      render(
        <TestApp
          initialEntries={["/setup"]}
          requireRoles={["super_admin", "marker"]}
          loginResponse={makeUser()}
        />,
      );
      await loginAndVisit();
      expect(screen.getByText("marker home")).toBeInTheDocument();
    });
  });

  describe("requirePermissions", () => {
    it("renders when the user holds the required permission", async () => {
      render(
        <TestApp
          initialEntries={["/setup"]}
          requirePermissions={["evaluations.submit"]}
          loginResponse={makeUser()}
        />,
      );
      await loginAndVisit();
      expect(screen.getByText("marker home")).toBeInTheDocument();
    });

    it("redirects to /unauthorized when it doesn't", async () => {
      render(
        <TestApp
          initialEntries={["/setup"]}
          requirePermissions={["grades.export"]}
          loginResponse={makeUser()}
        />,
      );
      await loginAndVisit();
      expect(screen.getByText("unauthorized page")).toBeInTheDocument();
    });

    it("is any-of — holding one listed permission is enough", async () => {
      render(
        <TestApp
          initialEntries={["/setup"]}
          requirePermissions={["grades.export", "annotations.manage"]}
          loginResponse={makeUser()}
        />,
      );
      await loginAndVisit();
      expect(screen.getByText("marker home")).toBeInTheDocument();
    });
  });

  it("ands the two props together — one passing is not enough", async () => {
    render(
      <TestApp
        initialEntries={["/setup"]}
        requireRoles={["marker"]}
        requirePermissions={["grades.export"]}
        loginResponse={makeUser()}
      />,
    );
    await loginAndVisit();
    expect(screen.getByText("unauthorized page")).toBeInTheDocument();
  });

  it("never renders protected content when the summary failed to load", async () => {
    // Decision #40 makes this near-unreachable (a failed /me tears the session
    // down), but a null summary silently passing every gate would be the worst
    // possible failure mode, so the branch is asserted directly.
    stub(null);
    render(
      <TestApp
        initialEntries={["/setup"]}
        requirePermissions={["evaluations.submit"]}
        loginResponse={makeUser()}
      />,
    );

    await act(async () => {
      screen.getByText("do-login").click();
    });

    // The failed /me is a 401 on a request that carried a token, so
    // api-client's interceptor treats it as a dead session and redirects —
    // arriving at the same place decision #40 wants, one layer earlier.
    expect(screen.queryByText("marker home")).not.toBeInTheDocument();
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("does not gate on a null summary while bootstrapping", async () => {
    // The regression this guards: if isBootstrapping stops covering the /me
    // call, ProtectedRoute reads a null summary on a genuinely-permitted route
    // and flash-redirects to /unauthorized before the summary lands.
    let releaseMe: (() => void) | undefined;
    const mePending = new Promise<void>((resolve) => {
      releaseMe = resolve;
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: unknown) => {
        const url = String(
          typeof input === "string" ? input : (input as Request)?.url ?? "",
        );
        if (url.includes("/role-assignments/me")) {
          await mePending;
          return stubFetchWithSummary(markerSummary)(input);
        }
        return unauthorizedResponse();
      }),
    );

    render(
      <TestApp
        initialEntries={["/setup"]}
        requirePermissions={["evaluations.submit"]}
        loginResponse={makeUser()}
      />,
    );

    await act(async () => {
      screen.getByText("do-login").click();
    });

    // /me is still in flight — nothing should have been decided yet.
    expect(screen.queryByText("unauthorized page")).not.toBeInTheDocument();

    await act(async () => {
      releaseMe?.();
      await mePending;
    });
    await act(async () => {
      screen.getByText("go-to-marker").click();
    });

    expect(screen.getByText("marker home")).toBeInTheDocument();
  });
});
