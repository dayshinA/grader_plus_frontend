import { ensureAuthenticated } from "~/features/auth/utils";
import { departmentsQueryKey } from "~/features/departments/api/use-departments";
import { departmentsService } from "~/features/departments/api/departments.service";
import { DepartmentsPage } from "~/features/departments/components/departments-page";
import { queryClient } from "~/lib/query-client";

export function meta() {
  return [{ title: "Departments — GraderPlus" }];
}

export async function clientLoader() {
  // Must run first — see ensureAuthenticated's own comment. On a hard
  // reload this loader can fire before AuthProvider has mounted, so a
  // silent-session-recovery attempt has to happen here too, not just in
  // AuthProvider's own mount effect.
  if (!(await ensureAuthenticated())) return null;
  await queryClient.ensureQueryData({
    queryKey: departmentsQueryKey,
    queryFn: departmentsService.getDepartments,
  });
  return null;
}

export default function SuperAdminDepartments() {
  return <DepartmentsPage />;
}
