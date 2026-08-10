import { toast } from "sonner";

import { Button } from "~/components/ui/button";

export function SonnerDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        onClick={() =>
          toast.success("Client created", {
            description: "The new client's wallet and API key are ready.",
          })
        }
      >
        Success toast
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.error("Disbursement failed", {
            description: "The gateway declined the transfer. Try again.",
          })
        }
      >
        Error toast
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.warning("Client suspended", {
            description: "This client can no longer collect or disburse funds.",
          })
        }
      >
        Warning toast
      </Button>
    </div>
  );
}
