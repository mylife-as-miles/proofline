"use client";

/**
 * The Lab: one small, fully deterministic model a reader can run against a
 * passage. Nothing here calls a model or the network — the arithmetic is
 * checkable by hand, and every number the panel shows is computed here, so a
 * result is reproducible. The panel labels the source passage, the model's
 * assumptions and the simulation separately; the model never speaks for the text.
 */

export type LabParams = { v0: number; rate: number; periods: number };

export type LabModel = {
  id: "compound";
  name: string;
  /** The formula, as a reader would write it. */
  formula: string;
  /** Why a growth model is the simplest one that fits the passage. */
  fit: string;
  assumptions: { title: string; detail: string }[];
  defaults: LabParams;
  bounds: { v0: [number, number]; rate: [number, number]; periods: [number, number] };
};

const GROWTH = /\b(compound(?:ed|ing)?|doubl(?:e|es|ed|ing)|exponential(?:ly)?|multipl(?:y|ies|ied)|growth|grows?|grew|accumulat(?:e|es|ed|ing)|increas(?:e|es|ed|ing)|interest)\b/i;
/** Growth worth modelling needs a quantity: a rate, a period, a figure. */
const QUANTITY =
  /\d|per ?cent|percent|%|\b(rate|rates|year|years|month|months|day|days|century|twice|thousand|thousands|million|millions|hundred|units?)\b|\b(tenth|half|quarter|third|fifth|double|twice)\b/i;
/**
 * A worked compounding rule rarely uses the word "growth": it says what is added
 * to what is already there, each step. "add a tenth … at each step" is the same
 * arithmetic as "grows 10% a period", so it gets the model too.
 */
const STEPWISE =
  /\b(add(?:s|ed|ing)?|plus|increas(?:e|es|ed|ing)|rais(?:e|es|ed|ing))\b[\s\S]{0,80}?\b(each|every|per|at each)\b[\s\S]{0,24}?\b(step|steps|period|periods|round|rounds|year|years|month|months|day|days|time)\b/i;

export const COMPOUND: LabModel = {
  id: "compound",
  name: "Compound growth",
  formula: "V = V₀ × (1 + r)ⁿ",
  fit: "The passage speaks of a quantity growing or accumulating. The simplest model that fits is a fixed share added every period, on top of what is already there.",
  assumptions: [
    { title: "A fixed share each period", detail: "The same percentage is added every period. Nothing speeds up or slows down." },
    { title: "Growth lands on the whole quantity", detail: "Each period’s addition is applied to everything accumulated so far, not just to the starting amount." },
    { title: "Nothing else changes", detail: "No cap, no decay, no losses, no change in the rate. Equal periods of equal length." },
  ],
  defaults: { v0: 100, rate: 5, periods: 5 },
  /** One to twenty periods, so the smallest worked examples (110 after one, 121 after two) can be run. */
  bounds: { v0: [10, 1000], rate: [1, 20], periods: [1, 20] },
};

/** null unless the passage is genuinely about a growing quantity. */
export function modelFor(quote: string): LabModel | null {
  const text = quote.replace(/\s+/g, " ").trim();
  if (text.length < 40) return null;
  if (!QUANTITY.test(text)) return null;
  if (!GROWTH.test(text) && !STEPWISE.test(text)) return null;
  return COMPOUND;
}

export type LabRun = {
  params: LabParams;
  /** The value at the start and after every period. */
  series: number[];
  final: number;
  added: number;
  /** The same rate applied only to the starting amount. */
  simple: number;
  /** What compounding adds over that. */
  compoundExtra: number;
  /** Periods to double, if the rate is above zero. */
  doubling: number;
  early: number;
  late: number;
};

const stretch = (series: number[], from: number, to: number) => series[to] - series[from];

/** Every number in the panel comes from here. */
export function simulate(params: LabParams): LabRun {
  const { v0, rate, periods } = params;
  const r = rate / 100;
  const series: number[] = [];
  for (let k = 0; k <= periods; k++) series.push(v0 * Math.pow(1 + r, k));
  const final = series[periods];
  const half = Math.floor(periods / 2);
  return {
    params,
    series,
    final,
    added: final - v0,
    simple: v0 * (1 + r * periods),
    compoundExtra: final - v0 * (1 + r * periods),
    doubling: r > 0 ? Math.log(2) / Math.log(1 + r) : Infinity,
    early: stretch(series, 0, half),
    late: stretch(series, half, periods),
  };
}

/** A result shown to the reader: two decimals when the arithmetic does not land on a whole number. */
export const fig = (n: number) =>
  Number.isFinite(n)
    ? n.toLocaleString("en-GB", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })
    : "—";

/**
 * The same rule as fig(), used in prose. One rounding for the whole panel, so the
 * figure on screen and the same figure in the explanation never disagree
 * (161.05 is never followed by "161.1").
 */
export const num = (n: number) => fig(n);

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** What the run shows, in order: the compounding itself, then the reader's guess, then what changed. */
export function explain(run: LabRun, guess: number | null, previous: LabRun | null): string[] {
  const out: string[] = [];
  const { rate, periods, v0 } = run.params;
  out.push(
    `${num(v0)} at ${rate}% a period reaches ${num(run.final)} after ${plural(periods, "period")}. The same rate applied only to the starting amount would reach ${num(
      run.simple
    )}, so compounding on the growth adds ${num(run.compoundExtra)} on top.`
  );
  out.push(
    `The growth is not spread evenly: the first ${plural(Math.floor(periods / 2), "period")} add ${num(run.early)}, the last ${plural(
      periods - Math.floor(periods / 2),
      "period"
    )} add ${num(run.late)}.`
  );
  if (Number.isFinite(run.doubling)) out.push(`At ${rate}% a period the quantity doubles every ${run.doubling.toFixed(1)} periods.`);
  if (guess !== null && Number.isFinite(guess)) {
    const off = ((guess - run.final) / run.final) * 100;
    const gap = Math.abs(off);
    if (gap < 2) out.push(`You predicted ${num(guess)} — within 2% of the model’s ${num(run.final)}.`);
    else
      out.push(
        `You predicted ${num(guess)}. The model puts it at ${num(run.final)}: your guess was ${num(gap)}% ${off > 0 ? "high" : "low"}${
          off < 0 ? ", the usual direction for compounding" : ""
        }.`
      );
  }
  if (previous) {
    const a = previous.params;
    const moves: string[] = [];
    if (a.rate !== rate) moves.push(`rate ${a.rate}% → ${rate}%`);
    if (a.periods !== periods) moves.push(`periods ${a.periods} → ${periods}`);
    if (a.v0 !== v0) moves.push(`start ${num(a.v0)} → ${num(v0)}`);
    if (moves.length) {
      const delta = run.final - previous.final;
      out.push(
        `What changed since your last run: ${moves.join(", ")}. The result moved from ${num(previous.final)} to ${num(run.final)} (${
          delta >= 0 ? "+" : "−"
        }${num(Math.abs(delta))}).`
      );
    }
  }
  return out;
}
