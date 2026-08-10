import { useParams } from "react-router";

import { BackLink } from "~/components/ui/back-link";
import { ErrorCard } from "~/components/ui/error-card";
import { PageHeader } from "~/components/ui/page-header";
import { Skeleton } from "~/components/ui/skeleton";
import { PermissionGate } from "~/features/permissions/components/permission-gate";
import { ensureAuthenticated } from "~/features/auth/utils";
import { usersQueryKey, useUsers } from "~/features/users/api/use-users";
import { usersService } from "~/features/users/api/users.service";
import { UserDetailPage } from "~/features/users/components/user-detail-page";
import { queryClient } from "~/lib/query-client";

export function meta() {
  return [{ title: "User details — GraderPlus" }];
}

export async function clientLoader() {
  // Must run first — see ensureAuthenticated's own comment (see users.tsx's loader for the
  // full explanation of why this has to happen before any authenticated request).
  if (!(await ensureAuthenticated())) return null;
  // Same convention as users.$userId.edit.tsx: there's no dedicated GET /users/:id, so the target
  // is found in the already-loaded list by id. prefetchQuery, not ensureQueryData, so a 403
  // reaches the component (via PermissionGate) rather than the raw ErrorBoundary.
  await queryClient.prefetchQuery({
    queryKey: usersQueryKey,
    queryFn: usersService.getUsers,
  });
  return null;
}

export default function ViewUser() {
  const { userId } = useParams<{ userId: string }>();
  const { data: users, isLoading } = useUsers();
  const user = users?.find((candidate) => candidate.id === userId);

  return (
    <PermissionGate
      permissions={["users.view", "users.create"]}
      title="User details"
      description="Everything one account is and can do, in one place."
    >
      {isLoading ? (
        <div className="space-y-6">
          <PageHeader title="User details" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : user ? (
        <UserDetailPage user={user} />
      ) : (
        <div className="space-y-6">
          <BackLink fallback={{ to: "/super-admin/users", label: "Users" }} />
          <PageHeader title="User details" />
          <ErrorCard
            title="User not found"
            description="This user couldn't be found, or your account doesn't have access to view them."
          />
        </div>
      )}
    </PermissionGate>
  );
}
