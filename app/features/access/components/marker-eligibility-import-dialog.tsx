import { ImportFileDialog } from "~/components/ui/import-file-dialog";
import { useImportMarkerRoles } from "~/features/access/api/use-access";

// Eligibility, not assignment: the two-to-five rule applies later, per project.
export function MarkerEligibilityImportDialog({
  open,
  onOpenChange,
  offeringId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offeringId: string;
}) {
  const importMarkers = useImportMarkerRoles(offeringId);

  return (
    <ImportFileDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Import eligible markers"
      description="Everyone listed becomes available to pick as a marker on this offering. It does not put anyone on a project, and a coordinator cannot add themselves to their own offering."
      columnsHelp={
        <>
          <code className="text-xs">email</code>, one address per row and
          nothing else. The role and the offering come from where you are. An
          address with no account fails its row: this import creates nobody, so
          missing people are created first through the accounts screen&apos;s
          import.
        </>
      }
      template={{
        fileName: "eligible-markers-template.csv",
        content: "email\n",
      }}
      submit={(file, dryRun) => importMarkers.mutateAsync({ file, dryRun })}
    />
  );
}
