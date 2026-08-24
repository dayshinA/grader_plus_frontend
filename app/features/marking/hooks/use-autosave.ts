import { useCallback, useEffect, useRef, useState } from "react";

export type AutosaveState = "idle" | "pending" | "saving" | "saved" | "failed";

// A failure reports `failed` without losing the form, and a save in flight at unmount is flushed.
export function useAutosave<T>(
  save: (value: T) => Promise<unknown>,
  delayMs = 800,
): {
  state: AutosaveState;
  error: unknown;
  /** Queue a save. Repeated calls inside the window collapse into one request. */
  schedule: (value: T) => void;
  /** Send whatever is queued right now, for a blur or a submit. */
  flush: () => void;
} {
  const [state, setState] = useState<AutosaveState>("idle");
  const [error, setError] = useState<unknown>(null);

  const pendingRef = useRef<{ value: T } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // In a ref so a new closure does not restart the debounce, set in an effect not during render.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const run = useCallback(() => {
    const queued = pendingRef.current;
    if (!queued) return;
    pendingRef.current = null;

    setState("saving");
    saveRef.current(queued.value).then(
      () => {
        // Another keystroke landed in flight, so the next run reports the real outcome.
        if (!pendingRef.current) {
          setError(null);
          setState("saved");
        }
      },
      (saveError: unknown) => {
        setError(saveError);
        setState("failed");
      },
    );
  }, []);

  const schedule = useCallback(
    (value: T) => {
      pendingRef.current = { value };
      setState("pending");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(run, delayMs);
    },
    [delayMs, run],
  );

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    run();
  }, [run]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      // Unmounting with something queued would lose the typing autosave exists to protect.
      if (pendingRef.current) {
        const queued = pendingRef.current;
        pendingRef.current = null;
        void saveRef.current(queued.value).catch(() => undefined);
      }
    },
    [],
  );

  return { state, error, schedule, flush };
}
