import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { X } from "lucide-react";
import {
  type FocusEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export type AlertPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type AlertVariant = "inline" | "toast";

export interface AlertProps {
  icon?: ReactNode;
  title: ReactNode;
  message: ReactNode;
  action?: ReactNode;
  dismissible?: boolean;
  variant?: AlertVariant;
  position?: AlertPosition;
  timeout?: number;
  onDismiss?: () => void;
  /** Force-disable the spring entrance, on top of the OS `prefers-reduced-motion` check. */
  reducedMotion?: boolean;
}

const DEFAULT_TOAST_POSITION: AlertPosition = "top-right";

const positionClasses: Record<AlertPosition, string> = {
  "top-left": "fixed top-4 inset-x-4 sm:inset-x-auto sm:left-4 sm:right-auto",
  "top-center":
    "fixed top-4 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2",
  "top-right": "fixed top-4 inset-x-4 sm:inset-x-auto sm:left-auto sm:right-4",
  "bottom-left":
    "fixed top-4 inset-x-4 sm:inset-x-auto sm:top-auto sm:bottom-4 sm:left-4 sm:right-auto",
  "bottom-center":
    "fixed top-4 inset-x-4 sm:inset-x-auto sm:top-auto sm:bottom-4 sm:left-1/2 sm:-translate-x-1/2",
  "bottom-right":
    "fixed top-4 inset-x-4 sm:inset-x-auto sm:top-auto sm:bottom-4 sm:left-auto sm:right-4",
};

const entryY: Record<AlertPosition, number> = {
  "top-left": -10,
  "top-center": -10,
  "top-right": -10,
  "bottom-left": 10,
  "bottom-center": 10,
  "bottom-right": 10,
};

const EASE_IN: [number, number, number, number] = [0.4, 0, 1, 1];

function getChildVariants(reduceMotion: boolean): Variants {
  if (reduceMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.1 } },
      exit: { opacity: 0, transition: { duration: 0.08 } },
    };
  }

  return {
    hidden: { opacity: 0, y: 4, filter: "blur(3px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] },
    },
    exit: { opacity: 0, transition: { duration: 0.12, ease: "easeIn" } },
  };
}

function getIconVariants(reduceMotion: boolean): Variants {
  if (reduceMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.1 } },
      exit: { opacity: 0, transition: { duration: 0.08 } },
    };
  }

  return {
    hidden: { scale: 0.5, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { type: "spring" as const, stiffness: 340, damping: 22, delay: 0.06 },
    },
    exit: { scale: 0.6, opacity: 0, transition: { duration: 0.12, ease: "easeIn" } },
  };
}

export const Alert = ({
  icon,
  title,
  message,
  action,
  dismissible = true,
  variant,
  position,
  timeout = 10_000,
  onDismiss,
  reducedMotion,
}: AlertProps) => {
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [isDocumentHidden, setIsDocumentHidden] = useState(false);

  const prefersReducedMotion = useReducedMotion() ?? false;
  const reduceMotion = Boolean(reducedMotion || prefersReducedMotion);

  const titleId = useId();
  const messageId = useId();
  const timeoutIdRef = useRef<number | null>(null);
  const remainingTimeRef = useRef(timeout);
  const timerStartedAtRef = useRef<number | null>(null);
  const dismissalRequestedRef = useRef(false);
  const previousTimeoutRef = useRef(timeout);

  const resolvedVariant: AlertVariant = position
    ? "toast"
    : (variant ?? "inline");
  const resolvedPosition =
    resolvedVariant === "toast"
      ? (position ?? DEFAULT_TOAST_POSITION)
      : undefined;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsDocumentHidden(document.hidden);
    };

    handleVisibilityChange();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const clearTimer = useCallback(() => {
    if (timeoutIdRef.current !== null) {
      window.clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }

    timerStartedAtRef.current = null;
  }, []);

  const requestDismiss = useCallback(() => {
    if (dismissalRequestedRef.current) {
      return;
    }

    dismissalRequestedRef.current = true;
    clearTimer();
    setVisible(false);
  }, [clearTimer]);

  const pauseTimer = useCallback(() => {
    if (timeoutIdRef.current === null || timerStartedAtRef.current === null) {
      return;
    }

    const elapsed = Date.now() - timerStartedAtRef.current;
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    clearTimer();
  }, [clearTimer]);

  const startTimer = useCallback(() => {
    if (timeoutIdRef.current !== null || remainingTimeRef.current <= 0) {
      return;
    }

    timerStartedAtRef.current = Date.now();
    timeoutIdRef.current = window.setTimeout(() => {
      clearTimer();
      requestDismiss();
    }, remainingTimeRef.current);
  }, [clearTimer, requestDismiss]);

  useEffect(() => {
    if (previousTimeoutRef.current === timeout) {
      return;
    }

    previousTimeoutRef.current = timeout;
    clearTimer();
    remainingTimeRef.current = timeout;

    if (
      visible &&
      timeout > 0 &&
      !(isHovered || isFocusWithin || isDocumentHidden)
    ) {
      startTimer();
    }
  }, [
    clearTimer,
    isDocumentHidden,
    isFocusWithin,
    isHovered,
    startTimer,
    timeout,
    visible,
  ]);

  useEffect(() => {
    if (!visible || timeout <= 0) {
      clearTimer();
      return;
    }

    if (isHovered || isFocusWithin || isDocumentHidden) {
      pauseTimer();
      return;
    }

    startTimer();
  }, [
    clearTimer,
    isDocumentHidden,
    isFocusWithin,
    isHovered,
    pauseTimer,
    startTimer,
    timeout,
    visible,
  ]);

  useEffect(() => clearTimer, [clearTimer]);

  const handleBlurCapture = (event: FocusEvent<HTMLDivElement>) => {
    const nextFocusedNode = event.relatedTarget;

    if (
      nextFocusedNode instanceof Node &&
      event.currentTarget.contains(nextFocusedNode)
    ) {
      return;
    }

    setIsFocusWithin(false);
  };

  const handleExitComplete = useCallback(() => {
    if (!dismissalRequestedRef.current) {
      return;
    }

    onDismiss?.();
  }, [onDismiss]);

  const dy = resolvedPosition ? entryY[resolvedPosition] : -8;
  const childVariants = getChildVariants(reduceMotion);
  const iconVariants = getIconVariants(reduceMotion);

  const containerVariants: Variants = reduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.12 } },
        exit: { opacity: 0, transition: { duration: 0.1 } },
      }
    : {
        hidden: { opacity: 0, y: dy, scale: 0.97, filter: "blur(6px)" },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          transition: {
            opacity: { duration: 0.22, ease: "easeOut" },
            y: { type: "spring" as const, stiffness: 320, damping: 26 },
            scale: { type: "spring" as const, stiffness: 320, damping: 26 },
            filter: { duration: 0.3, ease: "easeOut" },
            staggerChildren: 0.05,
            delayChildren: 0.08,
          },
        },
        exit: {
          opacity: 0,
          y: dy,
          scale: 0.97,
          filter: "blur(4px)",
          transition: { duration: 0.18, ease: EASE_IN },
        },
      };

  const card = (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {visible && (
        <motion.div
          animate="visible"
          aria-atomic={true}
          aria-describedby={messageId}
          aria-labelledby={titleId}
          aria-live="polite"
          className={cn(
            "relative flex items-start gap-3 overflow-hidden rounded-lg border border-border bg-popover px-3.5 text-popover-foreground shadow-lg shadow-black/5",
            resolvedVariant === "toast"
              ? "py-3 sm:max-w-sm sm:py-2.5"
              : "w-full max-w-sm py-3",
            resolvedPosition ? positionClasses[resolvedPosition] : undefined,
            resolvedPosition && "z-50"
          )}
          exit="exit"
          initial="hidden"
          onBlurCapture={handleBlurCapture}
          onFocusCapture={() => setIsFocusWithin(true)}
          onPointerEnter={() => setIsHovered(true)}
          onPointerLeave={() => setIsHovered(false)}
          role="status"
          variants={containerVariants}
        >
          {icon ? (
            <motion.div
              className="mt-0.5 shrink-0 text-foreground [&_svg]:h-[18px] [&_svg]:w-[18px]"
              variants={iconVariants}
            >
              {icon}
            </motion.div>
          ) : null}

          <div className="min-w-0 flex-1">
            <motion.div
              className="font-medium text-foreground text-sm leading-5 tracking-[-0.01em]"
              id={titleId}
              variants={childVariants}
            >
              {title}
            </motion.div>
            <motion.div
              className="mt-1 text-[13px] text-muted-foreground leading-5"
              id={messageId}
              variants={childVariants}
            >
              {message}
            </motion.div>
            {action ? (
              <motion.div
                className="mt-2 flex flex-wrap items-center gap-2"
                variants={childVariants}
              >
                {action}
              </motion.div>
            ) : null}
          </div>

          {dismissible && (
            <motion.div variants={childVariants}>
              <Button
                aria-label="Dismiss alert"
                className="-my-2 -mr-2 size-8 self-start text-foreground/35 hover:text-foreground/60"
                onClick={requestDismiss}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X className="size-3.5" />
              </Button>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (resolvedVariant === "toast") {
    return mounted ? createPortal(card, document.body) : null;
  }

  return card;
};

export default Alert;
