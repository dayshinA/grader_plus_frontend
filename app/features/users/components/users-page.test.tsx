import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UsersPage } from "~/features/users/components/users-page";
import { makeAssignment, makeSummary } from "~/features/permissions/test-support";
import type { PermissionKey, RoleTemplateKey } from "~/features/permissions/types";
import type { UserResponse } from "~/features/users/types";

/**
 * Capability gating on the Users screen.
 *
 * The screen is reachable on `users.view` OR `users.create`, so three different
 * templates land here holding three different subsets of the Users permissions.
 * Before 2026-08-10 every control rendered unconditionally, which put a "Bulk
 * import" button (System-Administrator-only `users.bulk_import`) in front of a
 * School Admin — see BUGS.md. These tests pin the per-permission rendering.
 */

const summary = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("~/features/auth/api/auth-context", () => ({
  useAuth: () => ({ permissions: summary.current }),
}));

const users: UserResponse[] = [
  {
    id: "u2",
    email: "ben@lboro.ac.uk",
    fullName: "Ben Osei",
    learnId: "ben1",
    isActive: true,
    createdAt: "2026-07-01T00:00:00.000Z",
  },
];

vi.mock("~/features/users/api/use-users", () => ({
  usersQueryKey: ["users"],
  useUsers: () => ({
    data: users,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
  }),
}));

function renderAs(template: RoleTemplateKey, permissionKeys: PermissionKey[]) {
  summary.current = makeSummary([template], {
    assignments: [makeAssignment(template, { permissionKeys })],
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const SYSTEM_ADMIN_KEYS: PermissionKey[] = [
  "users.view",
  "users.create",
  "users.update",
  "users.deactivate",
  "users.bulk_import",
];

/** School Admin's real seeded set for this domain — every Users key except bulk import. */
const SCHOOL_ADMIN_KEYS: PermissionKey[] = [
  "users.view",
  "users.create",
  "users.update",
  "users.deactivate",
];

/** Department Admin holds `users.update` but NOT `users.deactivate`. */
const DEPARTMENT_ADMIN_KEYS: PermissionKey[] = ["users.view", "users.create", "users.update"];

describe("UsersPage capability gating", () => {
  beforeEach(() => {
    summary.current = null;
  });

  it("offers every control to a System Administrator", async () => {
    renderAs("system_administrator", SYSTEM_ADMIN_KEYS);

    expect(screen.getAllByRole("link", { name: /bulk import/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /add user/i }).length).toBeGreaterThan(0);
  });

  it("hides Bulk import from a School Admin, who holds no users.bulk_import", () => {
    renderAs("school_admin", SCHOOL_ADMIN_KEYS);

    expect(screen.queryByRole("link", { name: /bulk import/i })).toBeNull();
    expect(screen.getAllByRole("link", { name: /add user/i }).length).toBeGreaterThan(0);
  });

  it("hides Deactivate from a Department Admin, who holds no users.deactivate", async () => {
    renderAs("department_admin", DEPARTMENT_ADMIN_KEYS);

    // The row actions live in a popover, so the menu has to be opened before its
    // contents exist in the DOM at all — asserting on the closed page would pass
    // whether or not the item is gated.
    await userEvent.click(screen.getAllByRole("button", { name: /actions for ben osei/i })[0]);

    expect(await screen.findByRole("menuitem", { name: /^edit$/i })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: /deactivate|reactivate/i })).toBeNull();
  });

  it("shows Deactivate to a School Admin, who does hold users.deactivate", async () => {
    renderAs("school_admin", SCHOOL_ADMIN_KEYS);

    await userEvent.click(screen.getAllByRole("button", { name: /actions for ben osei/i })[0]);

    expect(await screen.findByRole("menuitem", { name: /deactivate/i })).toBeTruthy();
  });

  it("hides Add user from a caller holding only users.view", () => {
    renderAs("school_admin", ["users.view"]);

    expect(screen.queryByRole("link", { name: /add user/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /bulk import/i })).toBeNull();
  });
});
