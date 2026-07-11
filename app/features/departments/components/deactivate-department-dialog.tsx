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
import { useDeactivateDepartment } from "~/features/departments/api/use-deactivate-department";
import { useUpdateDepartment } from "~/features/departments/api/use-update-department";
import type { DepartmentResponse } from "~/features/departments/types";
import { cn } from "~/lib/utils";

interface DeactivateDepartmentDialogProps {
  department: DepartmentResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful deactivate/reactivate, once the dialog has closed —
   * `apiMessage` is the backend's own confirmation message (see decision #31). */
  onSuccess?: (
    action: "deactivated" | "reactivated",
    department: DepartmentResponse,
    apiMessage: string,
  ) => void;
}

export function DeactivateDepartmentDialog({
  department,
  open,
  onOpenChange,
  onSuccess,
}: DeactivateDepartmentDialogProps) {
  const deactivateDepartment = useDeactivateDepartment();
  const updateDepartment = useUpdateDepartment();
  const isPending = deactivateDepartment.isPending || updateDepartment.isPending;

  if (!department) return null;

  const isReactivating = !department.isActive;

  function handleConfirm() {
    if (!department) return;

    if (isReactivating) {
      updateDepartment.mutate(
        { id: department.id, request: { isActive: true } },
        {
          onSuccess: ({ message }) => {
            onOpenChange(false);
            onSuccess?.("reactivated", department, message);
          },
        },
      );
    } else {
      // DELETE /departments/:id only returns { id }, not the full department — use the
      // already-known `department` prop for the toast instead of the response.
      deactivateDepartment.mutate(department.id, {
        onSuccess: ({ message }) => {
          onOpenChange(false);
          onSuccess?.("deactivated", department, message);
        },
      });
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isReactivating ? "Reactivate this department?" : "Deactivate this department?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isReactivating
              ? `${department.name} will be active again.`
              : `${department.name} will be marked inactive. It is kept, not deleted — you can reactivate it later. Note: any modules or admin grants pointing at it keep working unchanged — deactivating does not cascade.`}
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
