import { Badge } from "~/components/ui/badge";
import { OFFERING_STATUS_LABELS, type OfferingStatus } from "~/features/structure/types";

// Closed is the freeze, so it reads as a settled state rather than a failure.
const VARIANTS: Record<OfferingStatus, "secondary" | "default" | "warning" | "outline"> = {
  setup: "secondary",
  marking: "default",
  moderation: "warning",
  closed: "outline",
};

export function OfferingStatusBadge({
  status,
  className,
}: {
  status: OfferingStatus;
  className?: string;
}) {
  return (
    <Badge variant={VARIANTS[status]} className={className}>
      {OFFERING_STATUS_LABELS[status]}
    </Badge>
  );
}
