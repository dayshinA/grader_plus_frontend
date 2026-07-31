import { ProtectedRoute } from "~/features/auth/components/protected-route";

/**
 * Outer gate for `/super-admin/*` — the admin console (organisation, people,
 * roles).
 *
 * Gated on permission, not role (decision #39), so the prefix is now a section
 * name rather than a claim that only a Super Admin is here: School Admins and
 * Department Admins hold `roles.assign`/`users.create` within their own scope
 * and legitimately need the delegation screen.
 *
 * Any-of, and deliberately not including every administrative permission — each
 * screen inside re-checks the specific one it needs.
 *
 * ⚠️ `schools.view`, `departments.view` and `modules.view` must **never** appear
 * in this list. They read like admin permissions and are not: all three are
 * defaults on the *module-scoped Project Coordinator* template, granted so a
 * coordinator can resolve school/department/module names for their own pickers.
 * Gating on them let a plain Coordinator into the admin console — caught during
 * manual verification, logged in BUGS.md (2026-07-31). The permissions below are
 * the genuinely administrative ones: none of them appear in either Coordinator
 * template or the Marker template.
 */
export default function RequireAdmin() {
  return (
    <ProtectedRoute
      requirePermissions={[
        "users.view",
        "users.create",
        "roles.view",
        "roles.assign",
        "schools.create",
        "departments.create",
      ]}
    />
  );
}
