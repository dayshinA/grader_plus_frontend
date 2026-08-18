import { Navigate } from "react-router";

import { useAuth } from "~/features/auth/api/auth-context";
import { useHome } from "~/features/dashboard/api/use-dashboard";
import { HomePage } from "~/features/dashboard/components/home-page";
import { singleSurfaceLandingPath } from "~/features/dashboard/nav";

export function meta() {
  return [{ title: "Home | GraderPlus" }];
}

export default function HomeRoute() {
  const { grants } = useAuth();
  const { data } = useHome();
  const landingPath = singleSurfaceLandingPath(grants, data);

  if (landingPath) {
    return <Navigate to={landingPath} replace />;
  }

  return <HomePage />;
}
