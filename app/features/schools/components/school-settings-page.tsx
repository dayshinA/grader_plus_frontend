import { Alert } from "~/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { DelegateDepartmentAdminPanel } from "~/features/department-admin-grants/components/delegate-department-admin-panel";
import { SchoolAdminDepartmentsPanel } from "~/features/schools/components/school-admin-departments-panel";
import { useSchools } from "~/features/schools/api/use-schools";

/**
 * `coordinator/school-settings.tsx`'s real screen content — the FR41-43 School Admin surface
 * (decision #38). Unlike `ModuleSettingsPage` one level down (decision #27/#34), a plain
 * Coordinator has no existing relationship to Schools to fall back to, so a non-School-Admin
 * sees an inline empty-state Alert instead of a populated base view — the nav item itself is
 * still always shown (Dayshin confirmed this over introducing grant-conditional nav, since
 * every other role's nav in this app is static per `navGroupsByRole`).
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
        message="You don't administer any school yet. School Admin status is assigned by a Super Admin — once granted, this screen lets you create departments and delegate Department Admin status within your school."
      />
    );
  }

  return (
    <Tabs defaultValue="departments">
      <TabsList>
        <TabsTrigger value="departments">My Departments</TabsTrigger>
        <TabsTrigger value="delegate">Delegate Department Admin</TabsTrigger>
      </TabsList>
      <TabsContent value="departments">
        <SchoolAdminDepartmentsPanel />
      </TabsContent>
      <TabsContent value="delegate">
        <DelegateDepartmentAdminPanel />
      </TabsContent>
    </Tabs>
  );
}
