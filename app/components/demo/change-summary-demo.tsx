import { useState } from "react";
import { CircleSlash } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { ChangeSummary } from "~/components/ui/change-summary";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";

export function ChangeSummaryDemo() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  function handleConfirm() {
    setPending(true);
    window.setTimeout(() => {
      setPending(false);
      setOpen(false);
      toast.success("COP511 is now marked inactive.");
    }, 1200);
  }

  return (
    <div className="space-y-4">
      {/* On its own — how it reads inside any confirmation. */}
      <ChangeSummary
        items={[
          { label: "Module name", from: "Advanced SE", to: "Advanced Software Engineering" },
          { label: "Discrepancy threshold", from: "10", to: "15" },
          { label: "Learn ID", from: "", to: "LU-COP511-2526" },
          { label: "Marking deadline", to: "12 Aug 2026" },
        ]}
        caption="Only the fields that changed are listed."
      />

      <Button variant="outline" className="cursor-pointer" onClick={() => setOpen(true)}>
        Open in a confirmation
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        icon={CircleSlash}
        title="Deactivate this module?"
        description="COP511 will be marked inactive. It is kept, not deleted — you can reactivate it later."
        details={
          <ChangeSummary
            items={[
              { label: "Module", to: "COP511 — Advanced Software Engineering" },
              { label: "Status", from: "Active", to: "Inactive" },
            ]}
          />
        }
        confirmLabel="Deactivate"
        pendingLabel="Working…"
        isPending={pending}
        destructive
        onConfirm={handleConfirm}
      />
    </div>
  );
}
