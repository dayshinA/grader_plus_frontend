import { Navigate, useParams } from "react-router";

// A bare /units/:unitId has no screen of its own, and progress is what somebody wants cold.
export default function UnitIndexRoute() {
  const { unitId = "" } = useParams();
  return <Navigate to={`/units/${unitId}/dashboard`} replace />;
}
