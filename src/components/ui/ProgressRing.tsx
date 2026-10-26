"use client";

import { useEffect, useState } from "react";

/**
 * How far along, as a pen stroke closing a circle: it draws itself on from the
 * top, glows faintly where the ink is still wet, and fills in as you read.
 */
export default function ProgressRing({
  pct,
  size = 24,
  stroke = 2,
  className,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const r = 9;
  const c = 2 * Math.PI * r;
  const [p, setP] = useState(0);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setP(Math.max(0, Math.min(1, pct))));
    return () => cancelAnimationFrame(raf);
  }, [pct]);

  // Even a page or two in deserves a visible stroke.
  const arc = p > 0 ? Math.max(0.06, p) : 0;

  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={`shrink-0 -rotate-90 ${className ?? ""}`} aria-hidden>
      <circle cx="12" cy="12" r={r} fill="none" stroke="var(--rule-strong)" strokeWidth={stroke} />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke="var(--rubric)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - arc)}
        className="prog-ring-arc"
      />
    </svg>
  );
}
