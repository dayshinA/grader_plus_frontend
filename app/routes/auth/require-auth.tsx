import { ProtectedRoute } from "~/features/auth/components/protected-route";

export default function RequireAuth() {
  return <ProtectedRoute />;
}
