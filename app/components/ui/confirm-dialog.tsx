import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

/**
 * Confirmation step for an action that can't simply be undone — suspending a client, deleting one,
 * regenerating a key that stops the old one working, saving a new fee rate.
 *
 * `details` is where the change itself goes (usually a `ChangeSummary`): the prose says what the
 * action means, the details block says what is being changed and to what. It sits outside
 * `AlertDialogDescription` on purpose — that renders a `<p>`, and a list nested in a paragraph is
 * invalid markup that SSR and the client would hydrate differently.
 *
 * Controlled on purpose: the dialog stays open while the request is in flight and closes only when
 * the caller says so, so a failure leaves the admin looking at the thing they were confirming
 * (with the error in a toast) rather than at a list that silently didn't change.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  details,
  confirmLabel,
  pendingLabel = "Working…",
  cancelLabel = "Cancel",
  onConfirm,
  isPending = false,
  destructive = false,
  icon: Icon,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  details?: React.ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isPending?: boolean;
  destructive?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      {/* A change list needs more room than a sentence does, so the dialog widens when there is
          one — and scrolls inside itself rather than off the bottom of a phone. The overrides
          carry the same `data-[size=default]:` prefix as the widths they replace: an unprefixed
          `max-w-*` would lose to an attribute-selector one no matter which was written last. */}
      <AlertDialogContent
        className={
          details
            ? "data-[size=default]:max-w-[calc(100vw-2rem)] data-[size=default]:sm:max-w-md"
            : undefined
        }
      >
        <AlertDialogHeader>
          {Icon && (
            <AlertDialogMedia>
              <Icon aria-hidden="true" />
            </AlertDialogMedia>
          )}
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {details && <div className="max-h-[45vh] overflow-y-auto">{details}</div>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} className="h-11 cursor-pointer sm:h-9">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            // The variant prop, not a background class: `AlertDialogAction` renders a `Button`
            // with `asChild`, and Slot concatenates the two class lists instead of merging them —
            // so a hand-rolled `bg-destructive` loses to the button's own background.
            variant={destructive ? "destructive" : "default"}
            disabled={isPending}
            aria-busy={isPending}
            className="h-11 cursor-pointer sm:h-9"
            onClick={(event) => {
              // Closing is the caller's call — see the note above.
              event.preventDefault();
              onConfirm();
            }}
          >
            {isPending ? (
              <>
                <Loader2
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                {pendingLabel}
              </>
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
