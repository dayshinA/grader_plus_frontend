import { PermissionGate } from "~/features/permissions/components/permission-gate";
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
  // prefetchQuery, not ensureQueryData: under the RBAC model a list endpoint
  // 403s for a caller who lacks the permission (rather than returning an empty
  // 200), and a clientLoader runs *before* the component — so ensureQueryData's
  // throw escaped PermissionGate entirely and rendered the raw ErrorBoundary.
  // prefetchQuery is TanStack's documented graceful-degradation path: it never
  // throws, so the prefetch stays a head start and the component decides what
  // to show. Its own useQuery re-runs and surfaces any genuine error.
  // See BUGS.md 2026-07-31.
  // GET /schools self-filters by role — a Coordinator gets back only the schools they administer,
  // each with an `isAdmin: true` row. This is what SchoolSettingsPage uses to decide whether to
  // show the Tabs at all (decision #38). GET /departments is also prefetched here for the "My
  // Departments" tab's create-department flow and the "Delegate Department Admin" tab's
  // department picker (both filter to `isAdmin: true` rows, same as ModuleSettingsPage's pattern).
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: schoolsQueryKey,
      queryFn: schoolsService.getSchools,
    }),
    queryClient.prefetchQuery({
      queryKey: departmentsQueryKey,
      queryFn: departmentsService.getDepartments,
    }),
  ]);
  return null;
}

export default function CoordinatorSchoolSettings() {
  return (
    <PermissionGate permissions={["departments.create"]} title="School Settings">
      <SchoolSettingsPage />
    </PermissionGate>
  );
}
