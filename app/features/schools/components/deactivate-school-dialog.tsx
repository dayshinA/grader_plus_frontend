import { CircleCheck, CircleSlash } from "lucide-react";

import { ChangeSummary } from "~/components/ui/change-summary";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { useDeactivateSchool } from "~/features/schools/api/use-deactivate-school";
import { useUpdateSchool } from "~/features/schools/api/use-update-school";
import type { SchoolResponse } from "~/features/schools/types";

interface DeactivateSchoolDialogProps {
  school: SchoolResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful deactivate/reactivate, once the dialog has closed —
   * `apiMessage` is the backend's own confirmation message (see decision #31). */
  onSuccess?: (
    action: "deactivated" | "reactivated",
    school: SchoolResponse,
    apiMessage: string,
  ) => void;
}

export function DeactivateSchoolDialog({
  school,
  open,
  onOpenChange,
  onSuccess,
}: DeactivateSchoolDialogProps) {
  const deactivateSchool = useDeactivateSchool();
  const updateSchool = useUpdateSchool();
  const isPending = deactivateSchool.isPending || updateSchool.isPending;

  if (!school) return null;

  const isReactivating = !school.isActive;

  function handleConfirm() {
    if (!school) return;

    if (isReactivating) {
      updateSchool.mutate(
        { id: school.id, request: { isActive: true } },
        {
          onSuccess: ({ message }) => {
            onOpenChange(false);
            onSuccess?.("reactivated", school, message);
          },
        },
      );
    } else {
      // DELETE /schools/:id only returns { id }, not the full school — use the
      // already-known `school` prop for the toast instead of the response.
      deactivateSchool.mutate(school.id, {
        onSuccess: ({ message }) => {
          onOpenChange(false);
          onSuccess?.("deactivated", school, message);
        },
      });
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={isReactivating ? CircleCheck : CircleSlash}
      title={isReactivating ? "Reactivate this school?" : "Deactivate this school?"}
      description={
        isReactivating
          ? `${school.name} will be active again.`
          : `${school.name} will be marked inactive. It is kept, not deleted — you can reactivate it later. Any departments or admin grants pointing at it keep working unchanged: deactivating does not cascade.`
      }
      details={
        <ChangeSummary
          items={[
            {
              label: "School",
              to: school.name,
            },
            {
              label: "Status",
              from: isReactivating ? "Inactive" : "Active",
              to: isReactivating ? "Active" : "Inactive",
            },
          ]}
        />
      }
      confirmLabel={isReactivating ? "Reactivate" : "Deactivate"}
      pendingLabel="Working…"
      onConfirm={handleConfirm}
      isPending={isPending}
      destructive={!isReactivating}
    />
  );
}
