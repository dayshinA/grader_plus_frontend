import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button, buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export default function AlertDialogPreview() {
  const [controlledOpen, setControlledOpen] = useState(false);

  return (
    <main className="flex min-h-screen flex-col gap-10 bg-background p-10 text-foreground">
      <h1 className="text-xl font-semibold">AlertDialog preview</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Destructive confirm — asChild trigger, uncontrolled
        </h2>
        <div className="flex min-h-[100px] items-center rounded-lg border border-dashed border-border p-6">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete submission</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this submission?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove the submission and any evaluations attached to it.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className={cn(buttonVariants({ variant: "destructive" }))}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Neutral confirm — non-destructive action, default styling
        </h2>
        <div className="flex min-h-[100px] items-center rounded-lg border border-dashed border-border p-6">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button>Submit final grades</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Submit final grades?</AlertDialogTitle>
                <AlertDialogDescription>
                  Once submitted, grades are exported to Learn and markers can no longer amend
                  their scores for this module.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Submit</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Controlled — <code>open</code>/<code>onOpenChange</code> driven by this page
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
          <AlertDialog open={controlledOpen} onOpenChange={setControlledOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
                <AlertDialogDescription>
                  Opened without a trigger — driven entirely by this page's own state, e.g. for a
                  navigation-guard confirmation.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep editing</AlertDialogCancel>
                <AlertDialogAction>Discard</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <p className="text-xs text-muted-foreground">open: {String(controlledOpen)}</p>
      </section>
    </main>
  );
}
