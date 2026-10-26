"use client";

import { num, type LabRun } from "@/lib/lab";

const W = 320;
const H = 132;
const PAD = { l: 2, r: 2, t: 10, b: 16 };

/**
 * Two curves and one guess: what compounding does, what the same rate would do
 * on the starting amount alone, and where the reader thought it would land.
 */
export function LabCurve({ run, guess }: { run: LabRun; guess: number | null }) {
  const values = [...run.series, run.simple, ...(guess !== null && Number.isFinite(guess) ? [guess] : [])];
  const top = Math.max(...values, 1) * 1.06;
  const x = (i: number) => PAD.l + (i / run.params.periods) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / top) * (H - PAD.t - PAD.b);
  const path = (points: number[]) => points.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(" ");
  const simple = Array.from({ length: run.params.periods + 1 }, (_, i) => run.params.v0 * (1 + (run.params.rate / 100) * i));
  const last = run.params.periods;

  return (
    <figure className="mt-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Compound growth to ${num(run.final)} over ${last} periods`}>
        <line x1={PAD.l} y1={H - PAD.b + 0.5} x2={W - PAD.r} y2={H - PAD.b + 0.5} stroke="var(--rule)" strokeWidth="1" />
        {guess !== null && Number.isFinite(guess) && (
          <line
            x1={PAD.l}
            y1={y(guess)}
            x2={W - PAD.r}
            y2={y(guess)}
            stroke="var(--ink-4)"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
        )}
        <path d={path(simple)} fill="none" stroke="var(--rule-strong)" strokeWidth="1.4" strokeDasharray="4 4" />
        <path d={path(run.series)} fill="none" stroke="var(--rubric)" strokeWidth="2" strokeLinejoin="round" />
        <circle cx={x(last)} cy={y(run.final)} r="2.8" fill="var(--rubric)" />
        <text x={PAD.l} y={H - 4} fontSize="8.5" fill="var(--ink-4)">
          period 0
        </text>
        <text x={W - PAD.r} y={H - 4} fontSize="8.5" textAnchor="end" fill="var(--ink-4)">
          period {last}
        </text>
      </svg>
      <figcaption className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-4">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-[2px] w-4 rounded-full bg-[var(--rubric)]" /> compounding
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-0 w-4 border-t border-dashed border-ink-3" /> same rate, starting amount only
        </span>
        {guess !== null && Number.isFinite(guess) && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-0 w-4 border-t border-dashed border-ink-4" /> your prediction
          </span>
        )}
      </figcaption>
    </figure>
  );
}
