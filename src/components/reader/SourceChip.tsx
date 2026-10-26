"use client";

import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { sourceHref, type BriefSource } from "@/lib/brief";
import { VERDICT_WORD } from "@/lib/evidence";

/** A quotation with a link to the exact words it was copied from. */
export function SourceChip({ source }: { source: BriefSource }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(sourceHref(source))}
      data-tip="Open this passage"
      className="group/src inline-flex max-w-full items-center gap-1 rounded-full border border-rule px-2 py-1 text-left text-[11.5px] text-ink-2 transition-colors hover:border-rule-strong hover:text-ink"
    >
      <span className="truncate font-medium">{source.articleTitle}</span>
      {source.n ? <span className="cite pointer-events-none shrink-0 !m-0 !text-[11px]">¶{source.n}</span> : null}
      <ArrowUpRight size={12} className="shrink-0 text-ink-4 transition-colors group-hover/src:text-ink-2" aria-hidden />
    </button>
  );
}

export const VERDICT_TONE: Record<string, string> = {
  supports: "border-good/45 text-good",
  conflicts: "border-[color-mix(in_oklab,var(--rubric)_55%,transparent)] text-[var(--rubric-text)]",
  insufficient: "border-rule-strong text-ink-3",
};

export const verdictWord = (v: string) => VERDICT_WORD[v as keyof typeof VERDICT_WORD] ?? v;
