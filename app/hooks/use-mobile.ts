import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/** Tracks whether the viewport is below the `md` breakpoint (768px). Client-only — safe since
 * this app runs in SPA mode (`ssr: false`), no hydration mismatch to guard against. */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(
    () => window.innerWidth < MOBILE_BREAKPOINT,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
