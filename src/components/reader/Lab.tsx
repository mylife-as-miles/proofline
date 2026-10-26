"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ArrowRight, FlaskConical, RotateCcw, X } from "lucide-react";
import { COMPOUND, explain, fig, modelFor, num, simulate, type LabRun, type LabParams } from "@/lib/lab";
import { useStore } from "@/lib/store";
import { LabCurve } from "./LabCurve";
import { useReader } from "./context";

const label = "text-[11px] uppercase tracking-[0.1em] text-ink-4";

/**
 * Explore this idea: a sentence turned into something you can push on.
 * Change a variable, say where you think it ends up, run it, and read what
 * changed. The passage, the assumptions and the result are kept apart on
 * purpose — the numbers are the model's, not the author's.
 */
export function Lab() {
  const { ix, jumpToBlock } = useReader();
  const claim = useStore((s) => s.labClaim);
  const setUI = useStore((s) => s.setUI);
  const [params, setParams] = useState(COMPOUND.defaults);
  const [guess, setGuess] = useState("");
  const [run, setRun] = useState<LabRun | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [hinted, setHinted] = useState(false);
  const resultRef = useRef<HTMLElement>(null);

  // One quiet line the first time the panel is opened, then never again.
  useEffect(() => {
    try {
      setHinted(!localStorage.getItem("gloss:lab-hinted"));
    } catch {
      setHinted(true);
    }
  }, []);
  const dismissHint = () => {
    try {
      localStorage.setItem("gloss:lab-hinted", "1");
    } catch {}
    setHinted(false);
  };

  // A run lands below the settings: bring the numbers into view rather than leave them off-screen.
  useEffect(() => {
    if (run) resultRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [run]);

  // A new passage starts from the model's defaults, with nothing predicted yet.
  useEffect(() => {
    setParams(COMPOUND.defaults);
    setGuess("");
    setRun(null);
    setLines([]);
  }, [claim]);

  useEffect(() => {
    if (!claim) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if ((e.target as HTMLElement).closest("input, textarea, [contenteditable]")) return;
      e.stopPropagation();
      setUI({ labClaim: null });
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [claim, setUI]);

  const n = claim ? ix.numbers.get(claim.start.b) : undefined;

  if (!claim) return null;

  // Only a real number counts as a prediction. "banana" is not 0, and stripping the
  // letters out of it would quietly invent a guess the reader never made.
  const typed = guess.trim().replace(/[\s,]/g, "");
  const predicted = /^-?\d*\.?\d+$/.test(typed) ? Number(typed) : null;
  const goodGuess = predicted !== null && Number.isFinite(predicted);
  // Anything that is not a number is no prediction at all: the run still happens, without a guess to compare.
  const badGuess = guess.trim() !== "" && !goodGuess;

  const execute = () => {
    const next = simulate(params);
    setLines(explain(next, goodGuess ? predicted : null, run));
    setRun(next);
  };

  // Changing a variable throws away the old result: a figure left on screen would belong to other settings.
  const set = (key: keyof LabParams) => (e: ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setParams((p) => ({ ...p, [key]: v }));
    setRun(null);
    setLines([]);
  };

  return (
    <aside
      aria-label="Lab: explore this idea"
      role="dialog"
      className="fixed inset-x-2 bottom-2 top-[calc(var(--topbar-h)+6px)] z-[46] flex flex-col overflow-hidden rounded-[18px] border border-rule bg-raised shadow-pop sm:inset-x-auto sm:right-2.5 sm:w-[452px]"
      style={{ animation: "sheet-in 0.34s var(--ease-out)" }}
    >
      <header className="flex shrink-0 items-start gap-2 border-b border-rule px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 font-serif text-[21px] leading-none tracking-[-0.015em] text-ink [font-variation-settings:'opsz'_32]">
            <FlaskConical size={16} strokeWidth={1.8} className="text-rubric-text" aria-hidden /> Lab
          </h2>
          <p className="mt-1.5 text-[12px] leading-snug text-ink-3">One passage, made computable. The numbers are the model’s.</p>
        </div>
        <button
          type="button"
          aria-label="Close lab"
          onClick={() => setUI({ labClaim: null })}
          className="grid size-8 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-sunk hover:text-ink"
        >
          <X size={17} />
        </button>
      </header>

      <div className="scroll-thin flex-1 overflow-y-auto px-4 pb-5 pt-4">
        {hinted && (
          <div className="mb-3 flex items-start gap-2 rounded-[10px] border border-rule bg-sunk px-3 py-2 text-[12px] leading-snug text-ink-3">
            <span className="min-w-0 flex-1">Set a starting amount, a rate and a number of steps, then Run model. Every figure below is arithmetic — no AI is called here.</span>
            <button type="button" aria-label="Dismiss tip" onClick={dismissHint} className="shrink-0 text-ink-4 hover:text-ink">
              <X size={13} />
            </button>
          </div>
        )}
        <section aria-label="Source passage">
          <h3 className={label}>Source passage</h3>
          <blockquote className="mt-2 border-l-2 border-[var(--rubric-line)] pl-3 font-serif text-[15px] leading-[1.5] text-ink">“{claim.quote}”</blockquote>
          {!modelFor(claim.quote) && (
            <p className="mt-2 rounded-[10px] border border-rule bg-sunk px-3 py-2 text-[12px] leading-snug text-ink-3">
              This passage carries no figures of its own. Below is a worked illustration you can push on — it is not an arithmetic reading of this sentence.
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-3">
            <span className="min-w-0 truncate">{ix.article.title}</span>
            {n && <span className="cite pointer-events-none !m-0 !text-[11px]">¶{n}</span>}
            <button
              type="button"
              onClick={() => {
                jumpToBlock(claim.start.b, { flash: true });
                setUI({ labClaim: null });
              }}
              className="ml-auto inline-flex items-center gap-1 rounded-full border border-rule px-2 py-1 text-[11.5px] transition-colors hover:border-rule-strong hover:text-ink"
            >
              Open passage <ArrowRight size={11} aria-hidden />
            </button>
          </div>
          <p className="mt-2.5 text-[12px] leading-[1.5] text-ink-4">
            The model formalises the arithmetic this sentence implies. It is not the author’s claim, and it does not test one.
          </p>
        </section>

        <section aria-label="Model assumptions" className="mt-5 rounded-[13px] border border-rule bg-bg px-3.5 py-3">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className={label}>Model assumptions</h3>
            <span className="font-serif text-[13px] text-ink-2">{COMPOUND.name}</span>
          </div>
          <p className="mt-1.5 font-serif text-[14px] leading-snug text-ink">{COMPOUND.formula}</p>
          <ul className="mt-2 space-y-1.5">
            {COMPOUND.assumptions.map((a) => (
              <li key={a.title} className="text-[12.5px] leading-[1.5] text-ink-3">
                <span className="font-medium text-ink-2">{a.title}.</span> {a.detail}
              </li>
            ))}
          </ul>
          <p className="mt-2 border-t border-rule pt-2 text-[12px] leading-[1.5] text-ink-4">{COMPOUND.fit}</p>
        </section>

        <section aria-label="Change a variable" className="mt-5">
          <h3 className={label}>Change a variable</h3>
          <div className="mt-2.5 space-y-3">
            <Slider label="Starting amount" value={params.v0} display={num(params.v0)} min={COMPOUND.bounds.v0[0]} max={COMPOUND.bounds.v0[1]} step={10} onChange={set("v0")} />
            <Slider label="Growth each period" value={params.rate} display={`${params.rate}%`} min={COMPOUND.bounds.rate[0]} max={COMPOUND.bounds.rate[1]} step={1} onChange={set("rate")} />
            <Slider label="Periods" value={params.periods} display={String(params.periods)} min={COMPOUND.bounds.periods[0]} max={COMPOUND.bounds.periods[1]} step={1} onChange={set("periods")} />
          </div>

          <label className="mt-4 block">
            <span className={label}>Your prediction</span>
            <span className="mt-1.5 flex items-center gap-2">
              <input
                inputMode="decimal"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder={`Where does it end up after ${params.periods} periods?`}
                className="h-10 w-full rounded-[10px] border border-rule bg-bg px-3 text-[14px] tabular-nums text-ink outline-none transition-colors placeholder:text-ink-4 focus:border-rule-strong"
              />
            </span>
          </label>
          {badGuess && <p className="mt-1.5 text-[11.5px] leading-snug text-rubric-text">That is not a number, so no prediction will be compared.</p>}

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={execute}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-bg transition-transform active:scale-[0.97]"
            >
              Run model
              <ArrowRight size={13} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => {
                setParams(COMPOUND.defaults);
                setGuess("");
                setRun(null);
                setLines([]);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium text-ink-3 transition-colors hover:bg-sunk hover:text-ink"
            >
              <RotateCcw size={12} aria-hidden /> Reset
            </button>
          </div>
        </section>

        <section
          ref={resultRef}
          aria-label="Simulation result"
          aria-live="polite"
          className={`mt-5 rounded-[13px] border px-3.5 py-3 ${run ? "border-rule-strong bg-bg" : "border-dashed border-rule bg-transparent"}`}
        >
          <h3 className={label}>Simulation result</h3>
          {!run ? (
            <p className="mt-2 text-[12.5px] leading-[1.55] text-ink-3">
              Predict the outcome above, then run the model. You will see where it lands, how far your guess was, and what the compounding did that a flat
              rate would not.
            </p>
          ) : (
            <>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="font-serif text-[27px] leading-none tabular-nums text-ink">{fig(run.final)}</span>
                <span className="text-[12px] leading-snug text-ink-3">
                  after {run.params.periods} periods
                  {goodGuess && (
                    <>
                      {" · "}
                      <span className="text-ink-2">you predicted {num(predicted)}</span>
                    </>
                  )}
                </span>
              </div>
              <dl className="mt-2.5 grid grid-cols-3 gap-2 border-y border-rule py-2 text-[11.5px]">
                <div>
                  <dt className="text-ink-4">Added</dt>
                  <dd className="tabular-nums text-ink-2">{fig(run.added)}</dd>
                </div>
                <div>
                  <dt className="text-ink-4">Compounding adds</dt>
                  <dd className="tabular-nums text-ink-2">{fig(run.compoundExtra)}</dd>
                </div>
                <div>
                  <dt className="text-ink-4">Doubles every</dt>
                  <dd className="tabular-nums text-ink-2">{Number.isFinite(run.doubling) ? `${run.doubling.toFixed(1)}p` : "—"}</dd>
                </div>
              </dl>
              <LabCurve run={run} guess={goodGuess ? predicted : null} />
              <ul className="mt-2.5 space-y-2 border-t border-rule pt-2.5">
                {lines.map((l, i) => (
                  <li key={i} className="text-[12.5px] leading-[1.55] text-ink-2">
                    {l}
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 text-[11.5px] leading-[1.5] text-ink-4">
                Arithmetic under the assumptions above, with the values you chose. It says nothing about whether the passage is right — only what follows
                if its numbers compound.
              </p>
            </>
          )}
        </section>
      </div>
    </aside>
  );
}

function Slider({
  label: name,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2 text-[12.5px] text-ink-2">
        <span>{name}</span>
        <span className="tabular-nums text-ink">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        aria-label={name}
        className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-rule accent-[var(--rubric)]"
      />
    </label>
  );
}
