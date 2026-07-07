import { ProtectedRoute } from "~/features/auth/components/protected-route";

export default function RequireMarker() {
  return <ProtectedRoute allowedRoles={["marker"]} />;
}
