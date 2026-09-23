"use client";

import * as React from "react";

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeMedia(query: string) {
  return (onChange: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  };
}

/**
 * Media queries through useSyncExternalStore: the value is read during
 * render on the client and falls back to `false` on the server, so there is
 * no setState-in-effect and no extra render on mount.
 */
export function useMediaQuery(query: string) {
  const subscribe = React.useMemo(() => subscribeMedia(query), [query]);
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function usePrefersReducedMotion() {
  return useMediaQuery(REDUCED_QUERY);
}

/**
 * Eases 0 → 1 once on mount so figures count up into place. When the viewer
 * prefers reduced motion the settled value is returned directly, without
 * ever scheduling a frame.
 */
export function useIntro(duration = 1100) {
  const reduced = usePrefersReducedMotion();
  const [t, setT] = React.useState(0);

  React.useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      // Scheduled callback, not the effect body: safe to set state here.
      setT(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [duration, reduced]);

  return reduced ? 1 : t;
}

/**
 * True once the client has hydrated — for UI that must not differ between
 * the server render and the first client render (e.g. the theme toggle).
 */
export function useHydrated() {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
