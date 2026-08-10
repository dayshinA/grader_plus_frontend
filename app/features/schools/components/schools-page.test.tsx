import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SchoolsPage } from "~/features/schools/components/schools-page";
import { makeAssignment, makeSummary } from "~/features/permissions/test-support";
import type { PermissionKey, RoleTemplateKey } from "~/features/permissions/types";

/**
 * Capability gating on the Schools screen. Same reasoning as
 * `departments-page.test.tsx`: nav-hidden from a School Admin but URL-reachable,
 * and `GET /schools` self-filters rather than 403ing, so the table populates for
 * someone holding none of the write permissions (BUGS.md 2026-08-10).
 */

const summary = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("~/features/auth/api/auth-context", () => ({
  useAuth: () => ({ permissions: summary.current }),
}));

vi.mock("~/features/schools/api/use-schools", () => ({
  schoolsQueryKey: ["schools"],
  useSchools: () => ({
    data: [
      {
        id: "s1",
        code: "SCI",
        name: "Science",
        isActive: true,
        createdAt: "2026-07-01T00:00:00.000Z",
        isAdmin: true,
      },
    ],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
  }),
}));

const SYSTEM_ADMIN_KEYS: PermissionKey[] = [
  "schools.view",
  "schools.create",
  "schools.update",
  "schools.deactivate",
];

/** School Admin's real seeded set: read its own school, write nothing. */
const SCHOOL_ADMIN_KEYS: PermissionKey[] = ["schools.view", "schools.view_detail"];

function renderAs(template: RoleTemplateKey, permissionKeys: PermissionKey[]) {
  summary.current = makeSummary([template], {
    assignments: [makeAssignment(template, { permissionKeys })],
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SchoolsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SchoolsPage capability gating", () => {
  beforeEach(() => {
    summary.current = null;
  });

  it("offers create and both row actions to a System Administrator", async () => {
    renderAs("system_administrator", SYSTEM_ADMIN_KEYS);

    expect(screen.getAllByRole("button", { name: /add school/i }).length).toBeGreaterThan(0);

    await userEvent.click(screen.getAllByRole("button", { name: /actions for science/i })[0]);
    expect(await screen.findByRole("menuitem", { name: /^edit$/i })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /deactivate/i })).toBeTruthy();
  });

  it("leaves a School Admin the read-only view", async () => {
    renderAs("school_admin", SCHOOL_ADMIN_KEYS);

    expect(screen.queryByRole("button", { name: /add school/i })).toBeNull();

    // The menu survives — "View departments" is a read the School Admin can make —
    // but neither write item is in it.
    await userEvent.click(screen.getAllByRole("button", { name: /actions for science/i })[0]);
    expect(await screen.findByRole("menuitem", { name: /view departments/i })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: /^edit$/i })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: /deactivate|reactivate/i })).toBeNull();
  });
});
