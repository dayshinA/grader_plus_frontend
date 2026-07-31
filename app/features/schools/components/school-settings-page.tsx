import { Alert } from "~/components/ui/alert";
import { SchoolAdminDepartmentsPanel } from "~/features/schools/components/school-admin-departments-panel";
import { useSchools } from "~/features/schools/api/use-schools";

/**
 * `coordinator/school-settings.tsx`'s screen content — the School Admin surface
 * (FR41-43).
 *
 * **No longer a `Tabs` page (CH-07, 2026-07-31).** It used to split into "My
 * Departments" and "Delegate Department Admin", but the delegation half is gone:
 * `department_admin_grants` no longer exists as a concept, and delegation now
 * lives on one user-centric screen (`/super-admin/role-assignments`) rather than
 * a panel per grant type. With one panel left there is nothing to switch
 * between, so the tab chrome went with it.
 *
 * Unlike `ModuleSettingsPage` one level down, a plain Coordinator has no
 * existing relationship to Schools to fall back to, so a non-School-Admin sees
 * an inline empty-state `Alert` rather than a populated base view. The nav item
 * itself is still always shown (decision #38 — its reversal is CH-16, Phase 4).
 */
export function SchoolSettingsPage() {
  const { data: schools, isLoading } = useSchools();
  const isSchoolAdmin = (schools ?? []).some((school) => school.isAdmin === true);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!isSchoolAdmin) {
    return (
      <Alert
        variant="inline"
        status="info"
        timeout={0}
        title="No schools administered"
        message="You don't administer any school yet. The School Admin role is assigned by a Super Admin — once you hold it, this screen lets you create departments within your school."
      />
    );
  }

  return <SchoolAdminDepartmentsPanel />;
}
