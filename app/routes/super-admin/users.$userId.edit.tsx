import { useParams } from "react-router";

import { BackLink } from "~/components/ui/back-link";
import { ErrorCard } from "~/components/ui/error-card";
import { PageHeader } from "~/components/ui/page-header";
import { Skeleton } from "~/components/ui/skeleton";
import { PermissionGate } from "~/features/permissions/components/permission-gate";
import { ensureAuthenticated } from "~/features/auth/utils";
import { usersQueryKey, useUsers } from "~/features/users/api/use-users";
import { usersService } from "~/features/users/api/users.service";
import { UserFormPage } from "~/features/users/components/user-form-page";
import { queryClient } from "~/lib/query-client";

export function meta() {
  return [{ title: "Edit user — GraderPlus" }];
}

export async function clientLoader() {
  // Must run first — see ensureAuthenticated's own comment (see users.tsx's loader for the
  // full explanation of why this has to happen before any authenticated request).
  if (!(await ensureAuthenticated())) return null;
  // Reachable by direct navigation (not only via a click from UsersPage), so the list has to be
  // fetched here too — there's no dedicated GET /users/:id call in this app yet, the edit page
  // finds its target the same way the table row it came from did, by id in the already-loaded
  // list. prefetchQuery, not ensureQueryData, for the same reason as every other admin-console
  // loader: a 403 must reach the component, not the raw ErrorBoundary (see BUGS.md 2026-07-31).
  await queryClient.prefetchQuery({
    queryKey: usersQueryKey,
    queryFn: usersService.getUsers,
  });
  return null;
}

export default function EditUser() {
  const { userId } = useParams<{ userId: string }>();
  const { data: users, isLoading } = useUsers();
  const user = users?.find((candidate) => candidate.id === userId);

  return (
    <PermissionGate
      permissions={["users.view", "users.create"]}
      title="Edit user"
      description="Change an account's details. Roles are managed from the delegation screen."
    >
      {isLoading ? (
        <div className="space-y-6">
          <PageHeader title="Edit user" />
          <Skeleton className="mx-auto h-96 w-full max-w-xl rounded-xl" />
        </div>
      ) : user ? (
        <UserFormPage mode="edit" user={user} />
      ) : (
        <div className="space-y-6">
          <BackLink fallback={{ to: "/super-admin/users", label: "Users" }} />
          <PageHeader title="Edit user" />
          <ErrorCard
            title="User not found"
            description="This user couldn't be found, or your account doesn't have access to view them."
          />
        </div>
      )}
    </PermissionGate>
  );
}
