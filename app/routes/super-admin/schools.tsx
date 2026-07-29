import { ensureAuthenticated } from "~/features/auth/utils";
import { schoolsQueryKey } from "~/features/schools/api/use-schools";
import { schoolsService } from "~/features/schools/api/schools.service";
import { SchoolsPage } from "~/features/schools/components/schools-page";
import { queryClient } from "~/lib/query-client";

export function meta() {
  return [{ title: "Schools — GraderPlus" }];
}

export async function clientLoader() {
  // Must run first — see ensureAuthenticated's own comment. On a hard
  // reload this loader can fire before AuthProvider has mounted, so a
  // silent-session-recovery attempt has to happen here too, not just in
  // AuthProvider's own mount effect.
  if (!(await ensureAuthenticated())) return null;
  await queryClient.ensureQueryData({
    queryKey: schoolsQueryKey,
    queryFn: schoolsService.getSchools,
  });
  return null;
}

export default function SuperAdminSchools() {
  return <SchoolsPage />;
}
