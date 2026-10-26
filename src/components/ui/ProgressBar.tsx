"use client";

import { useEffect, useState } from "react";

/**
 * How far along, as a line of wet ink: it draws itself in from the left, a slow
 * light runs along the part already read, and a soft bead sits at the wet end.
 */
export default function ProgressBar({ pct, className }: { pct: number; className?: string }) {
  const [p, setP] = useState(0);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setP(Math.max(0, Math.min(1, pct))));
    return () => cancelAnimationFrame(raf);
  }, [pct]);

  return (
    <span className={`prog ${className ?? ""}`} aria-hidden>
      <span className="prog-clip">
        <span className="prog-fill" style={{ ["--p" as string]: p }} />
      </span>
      {pct > 0 && <span className="prog-tip" style={{ ["--p" as string]: p }} />}
    </span>
  );
}
