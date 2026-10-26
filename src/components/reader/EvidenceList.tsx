"use client";

import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { VERDICT_LINE, VERDICT_WORD } from "@/lib/evidence";
import { useStore, type EvidenceFinding } from "@/lib/store";

const TONE: Record<EvidenceFinding["verdict"], string> = {
  supports: "border-good/45 text-good",
  conflicts: "border-[color-mix(in_oklab,var(--rubric)_55%,transparent)] text-[var(--rubric-text)]",
  insufficient: "border-rule-strong text-ink-3",
};

/**
 * A link to the exact paragraph a quote sits in, in another text. The quoted
 * offsets travel with it, so the paragraph opens in view with that span marked.
 */
export function AnchorLink({
  docId,
  title,
  n,
  blockId,
  start,
  end,
  compact,
}: {
  docId: string;
  title: string;
  n: number;
  blockId: string;
  start?: number;
  end?: number;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const setUI = useStore((s) => s.setUI);
  const exact = typeof start === "number" && typeof end === "number" && end > start;
  const jump = () => {
    // The notebook covers the paper on small screens: step aside so the passage is actually seen.
    if (window.innerWidth < 1900) setUI({ notebookOpen: false });
    navigate(`/read/${docId}?at=${encodeURIComponent(blockId)}${exact ? `&s=${start}&e=${end}` : ""}`);
  };
  return (
    <button
      type="button"
      onClick={jump}
      data-tip="Open this passage"
      className={`group/anchor inline-flex max-w-full items-center gap-1 rounded-full border border-rule px-2 py-1 text-left transition-colors hover:border-rule-strong hover:text-ink ${
        compact ? "text-[11.5px]" : "text-[12px]"
      } text-ink-2`}
    >
      <span className="truncate font-medium">{title}</span>
      <span className="cite pointer-events-none shrink-0 !m-0 !text-[11px]">¶{n}</span>
      <ArrowUpRight size={12} className="shrink-0 text-ink-4 transition-colors group-hover/anchor:text-ink-2" aria-hidden />
    </button>
  );
}

/** The checked findings, as the Investigate panel shows them. */
export function FindingList({ findings }: { findings: EvidenceFinding[] }) {
  return (
    <ul className="space-y-2.5">
      {findings.map((f, i) => (
        <li key={`${f.docId}-${f.blockId}-${i}`} className="rounded-[12px] border border-rule bg-bg px-3.5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`inline-flex items-center rounded-full border px-2 py-[3px] text-[11px] font-medium leading-none ${TONE[f.verdict]}`}>
              {VERDICT_WORD[f.verdict]} · {VERDICT_LINE[f.verdict].toLowerCase()}
            </span>
            <AnchorLink docId={f.docId} title={f.docTitle} n={f.n} blockId={f.blockId} start={f.start} end={f.end} />
          </div>
          {f.quote ? (
            <blockquote className="mt-2.5 border-l-2 border-[var(--rubric-line)] pl-3 font-serif text-[15px] leading-[1.5] text-ink">“{f.quote}”</blockquote>
          ) : (
            <p className="mt-2.5 text-[13px] leading-snug text-ink-3">The reviewed excerpts from this text do not establish it either way.</p>
          )}
          {f.why && (
            <p className="mt-2 text-[12.5px] leading-[1.5] text-ink-3">
              <span className="font-medium text-ink-2">AI reading</span> · {f.why}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

/** The notebook's version: the places the packet was checked against, one link each. */
export function EvidenceSources({ findings }: { findings: EvidenceFinding[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.08em] text-ink-4">Checked against</span>
      {findings.map((f, i) => (
        <AnchorLink key={`${f.docId}-${f.blockId}-${i}`} docId={f.docId} title={f.docTitle} n={f.n} blockId={f.blockId} start={f.start} end={f.end} compact />
      ))}
    </div>
  );
}
