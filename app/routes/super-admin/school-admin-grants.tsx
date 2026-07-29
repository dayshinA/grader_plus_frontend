import { ensureAuthenticated } from "~/features/auth/utils";
import { schoolsQueryKey } from "~/features/schools/api/use-schools";
import { schoolsService } from "~/features/schools/api/schools.service";
import { usersQueryKey } from "~/features/users/api/use-users";
import { usersService } from "~/features/users/api/users.service";
import { SchoolAdminGrantsPage } from "~/features/school-admin-grants/components/school-admin-grants-page";
import { queryClient } from "~/lib/query-client";

export function meta() {
  return [{ title: "School Admin Grants — GraderPlus" }];
}

export async function clientLoader() {
  // Must run first — see ensureAuthenticated's own comment. On a hard reload
  // this loader can fire before AuthProvider has mounted, so a silent-
  // session-recovery attempt has to happen here too, not just in
  // AuthProvider's own mount effect.
  if (!(await ensureAuthenticated())) return null;
  // Both lists are needed immediately for the school/coordinator pickers.
  // The grants list itself isn't prefetched here — it's school-selection-
  // dependent, and no school is selected on first load.
  await Promise.all([
    queryClient.ensureQueryData({
      queryKey: schoolsQueryKey,
      queryFn: schoolsService.getSchools,
    }),
    queryClient.ensureQueryData({
      queryKey: usersQueryKey,
      queryFn: usersService.getUsers,
    }),
  ]);
  return null;
}

export default function SuperAdminSchoolAdminGrants() {
  return <SchoolAdminGrantsPage />;
}
