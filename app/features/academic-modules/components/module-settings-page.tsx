import { ModulesPage } from "~/features/academic-modules/components/modules-page";

/**
 * `coordinator/module-settings.tsx`'s screen content.
 *
 * **No longer a `Tabs` page (CH-08, 2026-07-31).** The "Delegate Permissions"
 * tab was the module-creation-grant panel, whose endpoints
 * (`/departments/:id/module-creation-grants`) no longer exist — a
 * department-scoped Project Coordinator assignment replaced the grant table
 * entirely, and it's conferred from `/super-admin/role-assignments` like every
 * other role. That left "My Modules" as the only tab, so this collapses back to
 * exactly the single-screen `ModulesPage` it was before FR40.
 *
 * It also drops the `useDepartments()` call that decided whether to show the
 * tabs, which had become unreliable for the role it was testing for: the
 * Department Admin template holds no `departments.view`, so `GET /departments`
 * (gated on it anywhere) only succeeds for a Department Admin who *also* holds
 * some other role that carries it. The seed's `deptadmin@` does — it's a
 * module-scoped Project Coordinator too, and that template's defaults include
 * `departments.view` — so the call returns 200 there and 403 for a
 * department-admin-only account. Verified against the live backend 2026-07-31.
 *
 * Kept as its own component rather than pointing the route straight at
 * `ModulesPage`: the route is the Coordinator-facing one and `ModulesPage` is
 * shared with `/super-admin/modules`, so the `viewer` prop still has to be
 * pinned here. That prop itself goes in CH-15 (Phase 4).
 */
export function ModuleSettingsPage() {
  return <ModulesPage viewer="coordinator" />;
}
