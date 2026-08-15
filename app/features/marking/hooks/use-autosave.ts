import { useCallback, useEffect, useRef, useState } from "react";

export type AutosaveState = "idle" | "pending" | "saving" | "saved" | "failed";

/**
 * Debounced autosave with a visible state.
 *
 * Two things matter here beyond the debounce. A failure has to be visible and must not lose
 * the form, so the last value stays in component state and the state machine says `failed`
 * rather than silently reverting. And a save in flight when the component unmounts is
 * flushed, so navigating away from a workspace mid keystroke does not drop the keystroke.
 */
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
  // Held in a ref so a new closure from the caller does not restart the debounce, and
  // written in an effect because a ref must not be touched during render.
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
        // Another keystroke landed while this was in flight, so the answer is already
        // stale and the next run reports the real outcome.
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
      // Unmounting with something queued would lose it, and losing a marker's typing is
      // exactly what autosave exists to prevent.
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
