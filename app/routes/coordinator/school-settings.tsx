import { ensureAuthenticated } from "~/features/auth/utils";
import { departmentsQueryKey } from "~/features/departments/api/use-departments";
import { departmentsService } from "~/features/departments/api/departments.service";
import { schoolsQueryKey } from "~/features/schools/api/use-schools";
import { schoolsService } from "~/features/schools/api/schools.service";
import { SchoolSettingsPage } from "~/features/schools/components/school-settings-page";
import { queryClient } from "~/lib/query-client";

export function meta() {
  return [{ title: "School Settings — GraderPlus" }];
}

export async function clientLoader() {
  // Must run first — see ensureAuthenticated's own comment, same as module-settings.tsx's loader.
  if (!(await ensureAuthenticated())) return null;
  // GET /schools self-filters by role — a Coordinator gets back only the schools they administer,
  // each with an `isAdmin: true` row. This is what SchoolSettingsPage uses to decide whether to
  // show the Tabs at all (decision #38). GET /departments is also prefetched here for the "My
  // Departments" tab's create-department flow and the "Delegate Department Admin" tab's
  // department picker (both filter to `isAdmin: true` rows, same as ModuleSettingsPage's pattern).
  await Promise.all([
    queryClient.ensureQueryData({
      queryKey: schoolsQueryKey,
      queryFn: schoolsService.getSchools,
    }),
    queryClient.ensureQueryData({
      queryKey: departmentsQueryKey,
      queryFn: departmentsService.getDepartments,
    }),
  ]);
  return null;
}

export default function CoordinatorSchoolSettings() {
  return <SchoolSettingsPage />;
}
