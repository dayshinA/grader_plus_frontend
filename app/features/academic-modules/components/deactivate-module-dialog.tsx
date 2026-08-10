import { CircleCheck, CircleSlash } from "lucide-react";

import { ChangeSummary } from "~/components/ui/change-summary";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { useDeactivateModule } from "~/features/academic-modules/api/use-deactivate-module";
import { useUpdateModule } from "~/features/academic-modules/api/use-update-module";
import type { AcademicModuleResponse } from "~/features/academic-modules/types";

interface DeactivateModuleDialogProps {
  module: AcademicModuleResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful deactivate/reactivate, once the dialog has closed —
   * `apiMessage` is the backend's own confirmation message (see decision #31). */
  onSuccess?: (
    action: "deactivated" | "reactivated",
    module: AcademicModuleResponse,
    apiMessage: string,
  ) => void;
}

export function DeactivateModuleDialog({
  module,
  open,
  onOpenChange,
  onSuccess,
}: DeactivateModuleDialogProps) {
  const deactivateModule = useDeactivateModule();
  const updateModule = useUpdateModule();
  const isPending = deactivateModule.isPending || updateModule.isPending;

  if (!module) return null;

  const isReactivating = !module.isActive;

  function handleConfirm() {
    if (!module) return;

    if (isReactivating) {
      updateModule.mutate(
        { id: module.id, request: { isActive: true } },
        {
          onSuccess: ({ message }) => {
            onOpenChange(false);
            onSuccess?.("reactivated", module, message);
          },
        },
      );
    } else {
      // DELETE /academic-modules/:id only returns { id }, not the full module — use the
      // already-known `module` prop for the toast instead of the response.
      deactivateModule.mutate(module.id, {
        onSuccess: ({ message }) => {
          onOpenChange(false);
          onSuccess?.("deactivated", module, message);
        },
      });
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={isReactivating ? CircleCheck : CircleSlash}
      title={isReactivating ? "Reactivate this module?" : "Deactivate this module?"}
      description={
        isReactivating
          ? `${module.name} will be active again.`
          : `${module.name} will be marked inactive. It is kept, not deleted — you can reactivate it later.`
      }
      details={
        <ChangeSummary
          items={[
            {
              label: "Module",
              to: module.name,
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
