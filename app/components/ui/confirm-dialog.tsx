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

// Controlled, so a failed request leaves the dialog open on what was being confirmed.
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
            // The variant prop: Slot concatenates class lists, so a hand-rolled background loses.
            variant={destructive ? "destructive" : "default"}
            disabled={isPending}
            aria-busy={isPending}
            className="h-11 cursor-pointer sm:h-9"
            onClick={(event) => {
              // Closing is the caller's call, see the note above.
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
