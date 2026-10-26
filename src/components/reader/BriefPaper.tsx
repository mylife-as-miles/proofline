"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Copy, Check, RotateCcw, X } from "lucide-react";
import { briefMarkdown, type Brief } from "@/lib/brief";
import { patchBrief } from "@/lib/briefs";
import { SourceChip } from "./SourceChip";

/**
 * The assembled brief, as a document: a thesis, assertions each carrying the
 * words they rest on, and the disagreements left standing. The thesis and each
 * piece of reasoning are the reader's to rewrite; the citations are not.
 */
export function BriefPaper({ brief, onReset, onClose }: { brief: Brief; onReset: () => void; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const current = brief;
  const edit = (patch: Partial<Brief>) => patchBrief(current.id, patch);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(briefMarkdown(current));
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  const download = () => {
    const blob = new Blob([briefMarkdown(current)], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${current.title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "brief"}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="scroll-thin flex-1 overflow-y-auto px-5 pb-6 pt-5 sm:px-7">
        <article>
          <input
            value={current.title}
            onChange={(e) => edit({ title: e.target.value })}
            aria-label="Brief title"
            className="w-full bg-transparent font-serif text-[26px] leading-[1.15] tracking-[-0.015em] text-ink outline-none [font-variation-settings:'opsz'_40]"
          />
          {current.question && <p className="mt-2 text-[13.5px] leading-snug text-ink-3">{current.question}</p>}

          <label className="mt-4 block">
            <span className="text-[11px] uppercase tracking-[0.1em] text-ink-4">Thesis — editable</span>
            <AutoText value={current.thesis} onChange={(thesis) => edit({ thesis })} placeholder="What this brief argues" serif />
          </label>

          <h3 className="mt-6 flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-ink-4">
            Assertions <span className="tabular-nums text-ink-4">{current.assertions.length}</span>
          </h3>
          <ol className="mt-2.5 space-y-4">
            {current.assertions.map((a, i) => (
              <li key={a.id} className="rounded-[13px] border border-rule bg-bg px-3.5 py-3">
                <div className="grid grid-cols-[1.3rem_minmax(0,1fr)] gap-1">
                  <span className="font-serif text-[14px] leading-[1.5] tabular-nums text-ink-4">{i + 1}</span>
                  <p className="text-[15px] font-medium leading-[1.45] text-ink">{a.text}</p>
                </div>
                <div className="mt-2 space-y-1.5 border-l-2 border-[var(--rubric-line)] pl-3">
                  {a.sources.map((s, k) => (
                    <div key={`${s.articleId}-${s.start}-${k}`}>
                      <blockquote className="font-serif text-[13.5px] leading-[1.5] text-ink-2">“{s.quote}”</blockquote>
                      <div className="mt-1">
                        <SourceChip source={s} />
                      </div>
                    </div>
                  ))}
                </div>
                <label className="mt-2.5 block">
                  <span className="text-[11px] uppercase tracking-[0.1em] text-ink-4">Reasoning — editable</span>
                  <AutoText
                    value={a.reasoning}
                    placeholder="How these passages get you to the claim"
                    onChange={(reasoning) =>
                      edit({ assertions: current.assertions.map((x) => (x.id === a.id ? { ...x, reasoning } : x)) })
                    }
                  />
                </label>
              </li>
            ))}
          </ol>

          {current.tensions.length > 0 && (
            <section aria-label="Unresolved contradictions" className="mt-6">
              <h3 className="text-[11px] uppercase tracking-[0.1em] text-ink-4">Left unresolved</h3>
              <p className="mt-1 text-[12.5px] leading-snug text-ink-3">
                These passages pull against each other. Both sides are kept and nothing is settled here.
              </p>
              <ul className="mt-2.5 space-y-3">
                {current.tensions.map((t) => (
                  <li key={t.id} className="rounded-[13px] border border-[color-mix(in_oklab,var(--rubric)_30%,var(--rule))] px-3.5 py-3">
                    <div className="flex items-start gap-2">
                      <p className="min-w-0 flex-1 font-serif text-[14.5px] leading-[1.4] text-ink">{t.question}</p>
                      {t.origin === "evidence" && (
                        <span className="shrink-0 rounded-full border border-rule px-2 py-[3px] text-[10.5px] uppercase tracking-[0.06em] text-ink-4">
                          checked
                        </span>
                      )}
                    </div>
                    <ul className="mt-2 space-y-2">
                      {t.sides.map((s, k) => (
                        <li key={`${s.source.articleId}-${s.source.start}-${k}`}>
                          <p className="text-[11.5px] uppercase tracking-[0.06em] text-ink-4">{s.label}</p>
                          <blockquote className="mt-0.5 border-l-2 border-[var(--rubric-line)] pl-3 font-serif text-[13.5px] leading-[1.5] text-ink-2">
                            “{s.quote}”
                          </blockquote>
                          <div className="mt-1">
                            <SourceChip source={s.source} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {current.gaps.length > 0 && (
            <section aria-label="What this cannot settle" className="mt-6">
              <h3 className="text-[11px] uppercase tracking-[0.1em] text-ink-4">What this cannot settle</h3>
              <ul className="mt-2 space-y-1.5">
                {current.gaps.map((g, i) => (
                  <li key={i} className="grid grid-cols-[0.9rem_minmax(0,1fr)] text-[13px] leading-[1.5] text-ink-2">
                    <span aria-hidden className="mt-[0.55em] size-[4px] rounded-full bg-rubric/70" />
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="mt-6 border-t border-rule pt-3 text-[11.5px] leading-[1.55] text-ink-4">
            Assembled from {current.itemCount} marked passages across {current.texts.length} text{current.texts.length === 1 ? "" : "s"}:{" "}
            {current.texts.map((t) => t.title).join("; ")}. Every assertion is quoted from those passages and linked to its place; the reasoning is
            inference and editable. Nothing outside those passages was read.
            {current.dropped > 0 && ` ${current.dropped} quotation${current.dropped === 1 ? "" : "s"} could not be found and were left out.`}
          </p>
        </article>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-rule px-4 py-2.5">
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-sunk hover:text-ink"
        >
          {copied ? <Check size={13} className="text-good" /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          onClick={download}
          className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-sunk hover:text-ink"
        >
          <Download size={13} /> Markdown
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-sunk hover:text-ink"
        >
          <RotateCcw size={13} /> Sources
        </button>
        <span className="ml-auto text-[11px] tabular-nums text-ink-4">{current.model}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close brief"
          className="grid size-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-sunk hover:text-ink"
        >
          <X size={16} />
        </button>
      </footer>
    </div>
  );
}

/** A field that grows with what is in it: no scrollbars inside a document. */
function AutoText({
  value,
  onChange,
  placeholder,
  serif,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  serif?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`mt-1 block w-full resize-none rounded-[9px] border border-transparent bg-transparent px-2 py-1.5 outline-none transition-colors placeholder:text-ink-4 hover:border-rule focus:border-rule-strong ${
        serif ? "font-serif text-[16px] leading-[1.5] text-ink" : "text-[13px] leading-[1.55] text-ink-2"
      }`}
    />
  );
}
