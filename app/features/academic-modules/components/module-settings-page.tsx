import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ModulesPage } from "~/features/academic-modules/components/modules-page";
import { useDepartments } from "~/features/departments/api/use-departments";
import { DelegateModuleCreationPanel } from "~/features/module-creation-grants/components/delegate-module-creation-panel";

/**
 * `coordinator/module-settings.tsx`'s real screen content. A plain Coordinator (no
 * `department_admin_grants` row anywhere) sees exactly the old single-screen `ModulesPage` —
 * the Delegate Permissions tab only appears once `GET /departments` (self-filtering since the
 * 2026-07-11 fix, decision #33) returns at least one `isAdmin: true` row, per decision #27/#34.
 */
export function ModuleSettingsPage() {
  const { data: departments } = useDepartments();
  const isDepartmentAdmin = (departments ?? []).some((department) => department.isAdmin === true);

  if (!isDepartmentAdmin) {
    return <ModulesPage viewer="coordinator" />;
  }

  return (
    <Tabs defaultValue="modules">
      <TabsList>
        <TabsTrigger value="modules">My Modules</TabsTrigger>
        <TabsTrigger value="delegate">Delegate Permissions</TabsTrigger>
      </TabsList>
      <TabsContent value="modules">
        <ModulesPage viewer="coordinator" />
      </TabsContent>
      <TabsContent value="delegate">
        <DelegateModuleCreationPanel />
      </TabsContent>
    </Tabs>
  );
}
