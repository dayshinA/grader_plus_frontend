import { Navigate, useParams } from "react-router";

/**
 * A bare /units/:unitId has no screen of its own: the surface is a set of tabs, and
 * progress is the one somebody arriving cold wants.
 */
export default function UnitIndexRoute() {
  const { unitId = "" } = useParams();
  return <Navigate to={`/units/${unitId}/dashboard`} replace />;
}
