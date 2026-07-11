import { academicModulesQueryKey } from "~/features/academic-modules/api/use-academic-modules";
import { academicModulesService } from "~/features/academic-modules/api/academic-modules.service";
import { ModulesPage } from "~/features/academic-modules/components/modules-page";
import { ensureAuthenticated } from "~/features/auth/utils";
import { departmentsQueryKey } from "~/features/departments/api/use-departments";
import { departmentsService } from "~/features/departments/api/departments.service";
import { usersQueryKey } from "~/features/users/api/use-users";
import { usersService } from "~/features/users/api/users.service";
import { queryClient } from "~/lib/query-client";

export function meta() {
  return [{ title: "Modules — GraderPlus" }];
}

export async function clientLoader() {
  // Must run first — see ensureAuthenticated's own comment. On a hard reload this loader can
  // fire before AuthProvider has mounted, so a silent-session-recovery attempt has to happen
  // here too, not just in AuthProvider's own mount effect.
  if (!(await ensureAuthenticated())) return null;
  // All three are needed immediately: the module list itself, plus departments/users for the
  // Department/Coordinator table columns and the create/edit dialog's pickers (Super Admin can
  // call both GET /departments and GET /users, unlike a Coordinator viewer of this same page).
  await Promise.all([
    queryClient.ensureQueryData({
      queryKey: academicModulesQueryKey,
      queryFn: academicModulesService.getModules,
    }),
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

export default function SuperAdminModules() {
  return <ModulesPage viewer="super_admin" />;
}
