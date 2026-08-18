import { Navigate, useLocation, useParams } from "react-router";

import { ErrorCard } from "~/components/ui/error-card";
import { Skeleton } from "~/components/ui/skeleton";
import { usePermission } from "~/features/auth/api/auth-context";
import { useOfferingHeader } from "~/features/structure/api/use-offering-header";

/**
 * Opening an offering means opening the stage that matters now. Settings has its own
 * explicit route so a deliberate click remains possible after this default redirect.
 */
export default function OfferingIndexRoute() {
  const { offeringId = "" } = useParams();
  const location = useLocation();
  const canReadProgress = usePermission("dashboard.read");
  const { offering, isPending, isError, error, refetch, isFetching } =
    useOfferingHeader(offeringId);

  if (isError) {
    return (
      <ErrorCard
        title="Could not determine the first offering section"
        error={error}
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    );
  }

  if (isPending || !offering) {
    return <Skeleton className="h-32 rounded-xl" />;
  }

  const segment = offering.status === "marking" && canReadProgress ? "dashboard" : "settings";

  return (
    <Navigate
      to={`/offerings/${offeringId}/${segment}`}
      replace
      state={location.state}
    />
  );
}
