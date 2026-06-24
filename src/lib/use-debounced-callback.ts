import { useEffect, useMemo, useRef } from "react";

/**
 * Returns a stable debounced wrapper around `callback`. The latest callback is
 * always invoked (kept in a ref), so closures over fresh state stay correct
 * without re-creating the debounced function. The pending timer is cleared on
 * unmount. Used by the admin panel to throttle history.replaceState while typing.
 */
export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delay: number
): (...args: A) => void {
  const cbRef = useRef(callback);
  useEffect(() => {
    cbRef.current = callback;
  }, [callback]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return useMemo(
    () =>
      (...args: A) => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => cbRef.current(...args), delay);
      },
    [delay]
  );
}
