import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { buttonVariants } from "~/components/ui/button";
import { useDeactivateModule } from "~/features/academic-modules/api/use-deactivate-module";
import { useUpdateModule } from "~/features/academic-modules/api/use-update-module";
import type { AcademicModuleResponse } from "~/features/academic-modules/types";
import { cn } from "~/lib/utils";

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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isReactivating ? "Reactivate this module?" : "Deactivate this module?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isReactivating
              ? `${module.name} will be active again.`
              : `${module.name} will be marked inactive. It is kept, not deleted — you can reactivate it later.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={cn(!isReactivating && buttonVariants({ variant: "destructive" }))}
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              handleConfirm();
            }}
          >
            {isPending ? "Working..." : isReactivating ? "Reactivate" : "Deactivate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
