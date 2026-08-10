import { Landmark } from "lucide-react";

import { Card, CardContent } from "~/components/ui/card";
import { DataTable } from "~/components/ui/data-table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { PageHeader } from "~/components/ui/page-header";
import { findNavItem } from "~/features/dashboard/nav";
import { useSchools } from "~/features/schools/api/use-schools";
import { SchoolAdminDepartmentsPanel } from "~/features/schools/components/school-admin-departments-panel";

const nav = findNavItem("/workspace/school-settings");

/**
 * `workspace/school-settings.tsx`'s screen content — the School Admin surface
 * (FR41-43).
 *
 * **No longer a `Tabs` page (CH-07, 2026-07-31).** It used to split into "My
 * Departments" and "Delegate Department Admin", but the delegation half is gone:
 * `department_admin_grants` no longer exists as a concept, and delegation now
 * lives on one user-centric screen (`/super-admin/role-assignments`) rather than
 * a panel per grant type. With one panel left there is nothing to switch
 * between, so the tab chrome went with it.
 *
 * Unlike `ModulesPage` one level down, a plain Coordinator has no existing
 * relationship to Schools to fall back to, so a non-School-Admin sees an empty
 * state rather than a populated base view.
 */
export function SchoolSettingsPage() {
  const { data: schools, isLoading } = useSchools();
  const isSchoolAdmin = (schools ?? []).some((school) => school.isAdmin === true);

  if (isLoading) {
    // The same skeleton geometry the real table lands in, so nothing jumps when it arrives.
    return (
      <div className="space-y-6">
        <PageHeader title="School Settings" description={nav?.description} />
        <DataTable
          columns={[
            { id: "code", header: "Code", cell: () => null },
            { id: "name", header: "Name", cell: () => null },
            { id: "status", header: "Status", cell: () => null },
          ]}
          rows={[]}
          getRowId={() => ""}
          isLoading
        />
      </div>
    );
  }

  if (!isSchoolAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="School Settings" description={nav?.description} />
        <Card>
          <CardContent className="py-4">
            <Empty className="px-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Landmark aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No schools administered</EmptyTitle>
                <EmptyDescription>
                  You don't administer any school yet. The School Admin role is assigned by a
                  System Administrator — once you hold it, this screen lets you create departments
                  within your school.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <SchoolAdminDepartmentsPanel />;
}
