import { useState } from "react";
import { Ban } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";

export function ConfirmDialogDemo() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  function handleConfirm() {
    setPending(true);
    window.setTimeout(() => {
      setPending(false);
      setOpen(false);
      toast.success("Client suspended.");
    }, 1200);
  }

  return (
    <>
      <Button variant="outline" className="cursor-pointer" onClick={() => setOpen(true)}>
        Suspend client
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        icon={Ban}
        title="Suspend this client?"
        description="Achimota School is blocked from every action on the client API immediately — including any token they are already holding."
        confirmLabel="Suspend client"
        pendingLabel="Suspending…"
        isPending={pending}
        destructive
        onConfirm={handleConfirm}
      />
    </>
  );
}
