import { usePermission } from "~/features/auth/api/auth-context";
import { RequirePermission } from "~/features/auth/components/protected-route";
import { MarkingQueuePage } from "~/features/marking/components/marking-queue-page";

export function meta() {
  return [{ title: "My marking | GraderPlus" }];
}

export default function MarkingQueueRoute() {
  const allowed = usePermission("marking.work");
  return (
    <RequirePermission allowed={allowed} what="marking">
      <MarkingQueuePage />
    </RequirePermission>
  );
}
