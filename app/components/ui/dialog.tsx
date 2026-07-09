import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { X } from "lucide-react";
import * as React from "react";

import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface ReducedMotionProp {
  reducedMotion?: boolean;
}

const ReducedMotionOverrideContext = React.createContext(false);

function useResolvedReducedMotion(reducedMotion?: boolean) {
  const reducedMotionOverride = React.useContext(ReducedMotionOverrideContext);
  const prefersReducedMotion = useReducedMotion() ?? false;

  return Boolean(reducedMotion || reducedMotionOverride || prefersReducedMotion);
}

function ReducedMotionConfig({
  children,
  reducedMotion,
}: ReducedMotionProp & { children: React.ReactNode }) {
  const resolvedReducedMotion = useResolvedReducedMotion(reducedMotion);

  return (
    <MotionConfig reducedMotion={resolvedReducedMotion ? "always" : "user"}>
      {children}
    </MotionConfig>
  );
}

type DialogContextValue = {
  open: boolean;
  reduceMotion: boolean;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

const overlayTransition = {
  duration: 0.24,
  ease: [0.16, 1, 0.3, 1],
} as const;

function getContentVariants(reduceMotion: boolean): Variants {
  if (reduceMotion) {
    return {
      hidden: { opacity: 0, y: 12 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.16, ease: [0.22, 1, 0.36, 1] },
      },
      exit: {
        opacity: 0,
        y: 8,
        transition: { duration: 0.12, ease: [0.4, 0, 1, 1] },
      },
    };
  }

  return {
    hidden: {
      opacity: 0,
      scale: 0.9,
      y: 26,
      filter: "blur(10px)",
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        stiffness: 280,
        damping: 24,
        mass: 0.92,
        staggerChildren: 0.055,
        delayChildren: 0.04,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.96,
      y: 12,
      filter: "blur(4px)",
      transition: {
        type: "spring",
        stiffness: 340,
        damping: 28,
        mass: 0.86,
      },
    },
  };
}

function getChildVariants(reduceMotion: boolean): Variants {
  if (reduceMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.14 } },
      exit: { opacity: 0, transition: { duration: 0.1 } },
    };
  }

  return {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24,
        mass: 0.82,
      },
    },
    exit: {
      opacity: 0,
      y: -4,
      transition: { duration: 0.12, ease: [0.4, 0, 1, 1] },
    },
  };
}

function useDialogContext() {
  const context = React.useContext(DialogContext);

  if (!context) {
    throw new Error("Dialog components must be used within Dialog.");
  }

  return context;
}

export interface DialogProps extends ReducedMotionProp {
  children: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}

function Dialog({
  children,
  defaultOpen = false,
  onOpenChange,
  open: openProp,
  reducedMotion,
  ...props
}: DialogProps) {
  const isControlled = openProp !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = isControlled ? openProp : uncontrolledOpen;
  const reduceMotion = useResolvedReducedMotion(reducedMotion);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  return (
    <ReducedMotionConfig reducedMotion={reducedMotion}>
      <DialogContext.Provider value={{ open, reduceMotion }}>
        <DialogPrimitive.Root
          {...props}
          defaultOpen={defaultOpen}
          onOpenChange={handleOpenChange}
          open={open}
        >
          {children}
        </DialogPrimitive.Root>
      </DialogContext.Provider>
    </ReducedMotionConfig>
  );
}

const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Hides the built-in top-right close button — for cases where the dialog's own footer already supplies an explicit close/cancel action. */
  hideCloseButton?: boolean;
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ children, className, hideCloseButton = false, ...props }, ref) => {
    const { open, reduceMotion } = useDialogContext();
    const contentVariants = getContentVariants(reduceMotion);
    const childVariants = getChildVariants(reduceMotion);
    // These HTML event handler props conflict in type with framer-motion's
    // own MotionProps of the same name — stripped before spreading onto
    // motion.div below rather than forwarded.
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const {
      onAnimationEnd: _onAnimationEnd,
      onAnimationIteration: _onAnimationIteration,
      onAnimationStart: _onAnimationStart,
      onDrag: _onDrag,
      onDragEnd: _onDragEnd,
      onDragStart: _onDragStart,
      ...resolvedProps
    } = props;
    /* eslint-enable @typescript-eslint/no-unused-vars */

    return (
      <AnimatePresence initial={false}>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-50 bg-black/52 backdrop-blur-[10px]"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                transition={reduceMotion ? { duration: 0.14, ease: [0.4, 0, 1, 1] } : overlayTransition}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content
              className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4 outline-none"
              forceMount
            >
              <motion.div
                animate="visible"
                className={cn(
                  "relative flex w-[min(100%,34rem)] max-w-xl flex-col gap-5 rounded-xl border border-border/75 bg-background/96 p-6 text-foreground shadow-[0_32px_120px_rgba(15,23,42,0.18)] supports-[backdrop-filter]:bg-background/92 sm:p-7",
                  className,
                )}
                exit="exit"
                initial="hidden"
                ref={ref}
                variants={contentVariants}
                {...resolvedProps}
              >
                {React.Children.map(children, (child) =>
                  child == null ? null : <motion.div variants={childVariants}>{child}</motion.div>,
                )}
                {!hideCloseButton && (
                  <DialogPrimitive.Close
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon" }),
                      "absolute top-3 right-3 h-8 w-8",
                    )}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </DialogPrimitive.Close>
                )}
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    );
  },
);
DialogContent.displayName = "DialogContent";

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-2 text-left", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    className={cn(
      "font-semibold text-[1.35rem] text-foreground leading-tight tracking-[-0.03em]",
      className,
    )}
    ref={ref}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    className={cn("max-w-[46ch] text-[15px] text-muted-foreground leading-6", className)}
    ref={ref}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
};
