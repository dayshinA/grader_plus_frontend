import { ProtectedRoute } from "~/features/auth/components/protected-route";

export default function RequireCoordinator() {
  return <ProtectedRoute allowedRoles={["coordinator"]} />;
}
