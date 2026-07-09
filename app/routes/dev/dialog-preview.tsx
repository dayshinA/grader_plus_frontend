import { useState } from "react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export default function DialogPreview() {
  const [controlledOpen, setControlledOpen] = useState(false);

  return (
    <main className="flex min-h-screen flex-col gap-10 bg-background p-10 text-foreground">
      <h1 className="text-xl font-semibold">Dialog preview</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Form content — asChild trigger, uncontrolled, built-in close button
        </h2>
        <div className="flex min-h-[100px] items-center rounded-lg border border-dashed border-border p-6">
          <Dialog>
            <DialogTrigger asChild>
              <Button>Add user</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add user</DialogTitle>
                <DialogDescription>
                  Create a new account. They'll be required to change their password on first
                  login.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="preview-email">Email</Label>
                <Input id="preview-email" type="email" />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Controlled — <code>open</code>/<code>onOpenChange</code> driven by this page, no built-in
          close button (footer supplies its own)
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => setControlledOpen(true)}
        >
          Open programmatically
        </Button>
        <div className="flex min-h-[100px] items-center rounded-lg border border-dashed border-border p-6">
          <Dialog open={controlledOpen} onOpenChange={setControlledOpen}>
            <DialogContent hideCloseButton>
              <DialogHeader>
                <DialogTitle>Module details</DialogTitle>
                <DialogDescription>
                  Opened without a trigger — driven entirely by this page's own state.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={() => setControlledOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-xs text-muted-foreground">open: {String(controlledOpen)}</p>
      </section>
    </main>
  );
}
