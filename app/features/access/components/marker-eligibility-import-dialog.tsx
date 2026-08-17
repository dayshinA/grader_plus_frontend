import { ImportFileDialog } from "~/components/ui/import-file-dialog";
import { useImportMarkerRoles } from "~/features/access/api/use-access";

/**
 * Grants marker eligibility on one offering from a file of emails. Eligibility is not
 * assignment: any number of people can be made assignable, and the two-to-five marker rule
 * applies later, per project, on the assignment screen. Lives in access because the route
 * belongs to AccessModule, and is opened from the assignment screen where the eligible
 * list renders.
 */
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
      description="Every listed account becomes assignable as a marker on this offering. This makes them assignable, it does not put them on any project, and a coordinator cannot make themselves eligible on their own offering."
      columnsHelp={
        <>
          <code className="text-xs">email</code>, one address per row and nothing else. The
          role and the offering come from where you are. An address with no account fails
          its row: this import creates nobody, so missing people are created first through
          the accounts screen&apos;s import.
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
