"use client";

import { useEffect, useRef, useState } from "react";

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A number that walks to its new value, so progress reads as something moving
    rather than a figure swapped in behind your back. */
export function useCountUp(target: number, ms = 950): number {
  const [v, setV] = useState(() => (reduced() ? target : 0));
  const from = useRef(reduced() ? target : 0);

  useEffect(() => {
    if (reduced()) {
      from.current = target;
      setV(target);
      return;
    }
    const start = from.current;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      const next = start + (target - start) * (1 - Math.pow(1 - t, 3));
      from.current = next;
      setV(next);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return v;
}
