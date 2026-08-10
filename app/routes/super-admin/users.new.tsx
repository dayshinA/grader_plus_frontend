import { PermissionGate } from "~/features/permissions/components/permission-gate";
import { ensureAuthenticated } from "~/features/auth/utils";
import { UserFormPage } from "~/features/users/components/user-form-page";

export function meta() {
  return [{ title: "Add user — GraderPlus" }];
}

export async function clientLoader() {
  // Must run first — see ensureAuthenticated's own comment (see users.tsx's loader for the
  // full explanation of why this has to happen before any authenticated request).
  if (!(await ensureAuthenticated())) return null;
  return null;
}

export default function NewUser() {
  return (
    <PermissionGate permissions={["users.view", "users.create"]} title="Add user">
      <UserFormPage mode="create" />
    </PermissionGate>
  );
}
