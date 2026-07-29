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
import { useDeactivateSchool } from "~/features/schools/api/use-deactivate-school";
import { useUpdateSchool } from "~/features/schools/api/use-update-school";
import type { SchoolResponse } from "~/features/schools/types";
import { cn } from "~/lib/utils";

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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isReactivating ? "Reactivate this school?" : "Deactivate this school?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isReactivating
              ? `${school.name} will be active again.`
              : `${school.name} will be marked inactive. It is kept, not deleted — you can reactivate it later. Note: any departments or admin grants pointing at it keep working unchanged — deactivating does not cascade.`}
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
