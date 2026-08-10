import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DepartmentsPage } from "~/features/departments/components/departments-page";
import { makeAssignment, makeSummary } from "~/features/permissions/test-support";
import type { PermissionKey, RoleTemplateKey } from "~/features/permissions/types";

/**
 * Capability gating on the Departments screen.
 *
 * Its nav entry is `superAdminOnly`, but the route only sits behind
 * `require-admin`'s any-of gate — a School Admin holding `roles.assign` reaches
 * this URL directly and `GET /departments` answers them. They hold
 * `departments.create` and neither write, so the create button and the row menu
 * are gated independently (BUGS.md 2026-08-10).
 */

const summary = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("~/features/auth/api/auth-context", () => ({
  useAuth: () => ({ permissions: summary.current }),
}));

vi.mock("~/features/departments/api/use-departments", () => ({
  departmentsQueryKey: ["departments"],
  useDepartments: () => ({
    data: [
      {
        id: "d1",
        code: "CS",
        name: "Computer Science",
        schoolId: "s1",
        isActive: true,
        createdAt: "2026-07-01T00:00:00.000Z",
      },
    ],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
  }),
}));

vi.mock("~/features/schools/api/use-schools", () => ({
  schoolsQueryKey: ["schools"],
  useSchools: () => ({
    data: [{ id: "s1", code: "SCI", name: "Science", isActive: true, createdAt: "2026-07-01" }],
    isLoading: false,
    isError: false,
  }),
}));

const SYSTEM_ADMIN_KEYS: PermissionKey[] = [
  "departments.view",
  "departments.create",
  "departments.update",
  "departments.deactivate",
];

/** School Admin creates departments in its school but edits/deactivates none. */
const SCHOOL_ADMIN_KEYS: PermissionKey[] = ["departments.view", "departments.create"];

function renderAs(template: RoleTemplateKey, permissionKeys: PermissionKey[]) {
  summary.current = makeSummary([template], {
    assignments: [makeAssignment(template, { permissionKeys })],
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      {/* School-first browsing: the table only renders once a school is picked. */}
      <MemoryRouter initialEntries={["/super-admin/departments?schoolId=s1"]}>
        <DepartmentsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("DepartmentsPage capability gating", () => {
  beforeEach(() => {
    summary.current = null;
  });

  it("offers create and both row actions to a System Administrator", async () => {
    renderAs("system_administrator", SYSTEM_ADMIN_KEYS);

    expect(screen.getAllByRole("button", { name: /add department/i }).length).toBeGreaterThan(0);

    await userEvent.click(
      screen.getAllByRole("button", { name: /actions for computer science/i })[0],
    );
    expect(await screen.findByRole("menuitem", { name: /^edit$/i })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /deactivate/i })).toBeTruthy();
  });

  it("keeps create but drops the whole row menu for a School Admin", () => {
    renderAs("school_admin", SCHOOL_ADMIN_KEYS);

    expect(screen.getAllByRole("button", { name: /add department/i }).length).toBeGreaterThan(0);
    // Every item in that menu is a write, so the trigger itself goes rather than
    // opening onto an empty popover.
    expect(screen.queryByRole("button", { name: /actions for computer science/i })).toBeNull();
  });

  it("hides create from a caller holding only departments.view", () => {
    renderAs("school_admin", ["departments.view"]);

    expect(screen.queryByRole("button", { name: /add department/i })).toBeNull();
  });
});
