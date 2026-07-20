import { ensureAuthenticated } from "~/features/auth/utils";
import { departmentsQueryKey } from "~/features/departments/api/use-departments";
import { departmentsService } from "~/features/departments/api/departments.service";
import { usersQueryKey } from "~/features/users/api/use-users";
import { usersService } from "~/features/users/api/users.service";
import { ModuleCreationGrantsPage } from "~/features/module-creation-grants/components/module-creation-grants-page";
import { queryClient } from "~/lib/query-client";

export function meta() {
  return [{ title: "Module Creation Grants — GraderPlus" }];
}

export async function clientLoader() {
  // Must run first — see ensureAuthenticated's own comment. On a hard reload
  // this loader can fire before AuthProvider has mounted, so a silent-
  // session-recovery attempt has to happen here too, not just in
  // AuthProvider's own mount effect.
  if (!(await ensureAuthenticated())) return null;
  // Both lists are needed immediately for the department/coordinator pickers.
  // The grants list itself isn't prefetched here — it's department-selection-
  // dependent, and no department is selected on first load.
  await Promise.all([
    queryClient.ensureQueryData({
      queryKey: departmentsQueryKey,
      queryFn: departmentsService.getDepartments,
    }),
    queryClient.ensureQueryData({
      queryKey: usersQueryKey,
      queryFn: usersService.getUsers,
    }),
  ]);
  return null;
}

export default function SuperAdminModuleGrants() {
  return <ModuleCreationGrantsPage />;
}
