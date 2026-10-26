"use client";

import { useCountUp } from "@/lib/useCountUp";

/** The figure beside a progress mark, counting its way up to where you are. */
export default function ProgressNumber({
  value,
  suffix = "%",
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const n = Math.round(useCountUp(value) * 100);
  return (
    <span className={`tabular-nums ${className ?? ""}`}>
      {n}
      {suffix}
    </span>
  );
}
