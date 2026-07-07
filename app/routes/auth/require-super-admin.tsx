import { ProtectedRoute } from "~/features/auth/components/protected-route";

export default function RequireSuperAdmin() {
  return <ProtectedRoute allowedRoles={["super_admin"]} />;
}
