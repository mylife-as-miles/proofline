"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { blockText } from "@/lib/article";
import { fetchBrief } from "@/lib/ask";
import { useStore } from "@/lib/store";
import { useReader } from "./context";
import { readingStart, readingHeight } from '@/components/reader/readingScroll';

type Entry = { id: string; title: string; level: 0 | 1 };

/** Narrow screens: the drawer covers the text, so a jump puts it away. */
const covers = () => window.innerWidth < 900;

/**
 * A table of contents: the text's own headings, or — when it was written
 * without any — the parts its brief found. Click one to travel there.
 */
export function Toc() {
  const { ix, jumpToBlock } = useReader();
  const open = useStore((s) => s.tocOpen);
  const setUI = useStore((s) => s.setUI);
  const brief = useStore((s) => s.briefs[ix.article.id]);
  const [at, setAt] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // A text with real headings lists them; one written as a single run of
  // paragraphs borrows the map its brief drew instead.
  const entries = useMemo<Entry[]>(() => {
    const heads = ix.article.blocks
      .filter((b) => b.type === "h2" || b.type === "h3")
      .map((b) => ({ id: b.id, title: blockText(b).trim(), level: b.type === "h3" ? 1 : 0 }));
    if (heads.length >= 3) return heads;
    if (brief?.status === "ready") {
      const mapped = brief.data.sections
        .map((s) => ({ id: ix.byNumber.get(s.start) ?? "", title: s.title, level: 0 as const }))
        .filter((e) => e.id);
      if (mapped.length) return mapped;
    }
    return heads;
  }, [ix, brief]);

  // Which part the reader is in, so the list keeps its place under the eye.
  useEffect(() => {
    if (!open || !entries.length) return;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const line = readingStart() + readingHeight() * 0.32;
      let cur: string | null = null;
      for (const e of entries) {
        const el = document.querySelector<HTMLElement>(`.prose-read [data-block="${CSS.escape(e.id)}"]`);
        if (!el) continue;
        if (el.getBoundingClientRect().top > line) break;
        cur = e.id;
      }
      setAt(cur);
    };
    tick();
    const on = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener("scroll", on, { passive: true, capture: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on, true);
      window.removeEventListener("resize", on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [open, entries]);

  if (!open) return null;

  return (
    <aside
      role="dialog"
      aria-label="Contents"
      className="fixed bottom-2.5 left-2.5 right-2.5 top-[calc(var(--topbar-h)+6px)] z-[45] flex flex-col overflow-hidden rounded-[18px] border border-rule bg-raised shadow-pop sm:right-auto sm:w-[318px]"
      style={{ animation: "sheet-in 0.38s var(--ease-out)" }}
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-rule px-5 pb-3.5 pt-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-[23px] font-[420] leading-none tracking-[-0.015em] text-ink [font-variation-settings:'opsz'_36]">Contents</h2>
          <p className="mt-1.5 truncate text-[12.5px] leading-none text-ink-3">
            {entries.length ? `${entries.length} part${entries.length === 1 ? "" : "s"}` : "No parts to list"}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close contents"
          onClick={() => setUI({ tocOpen: false })}
          className="grid size-9 place-items-center rounded-full text-ink-3 transition-colors hover:bg-sunk hover:text-ink"
        >
          <X size={17} />
        </button>
      </header>

      {!entries.length ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 pb-16 text-center">
          <p className="font-serif text-[19px] leading-tight text-ink">Nothing to jump between yet</p>
          <p className="mt-2 max-w-[250px] text-[13.5px] leading-relaxed text-ink-3">
            This text has no headings. Its proof maps the movements it is made of, and they are listed here.
          </p>
          <button
            type="button"
            onClick={() => fetchBrief(ix)}
            className="mt-5 inline-flex h-9 items-center rounded-full border border-rule-strong px-4 text-[13px] font-medium text-ink transition-colors hover:border-ink-4"
          >
            {brief?.status === "loading" ? "Mapping the parts…" : "Proof this text"}
          </button>
        </div>
      ) : (
        <div ref={ref} className="scroll-thin flex-1 overflow-y-auto px-2.5 pb-4 pt-2">
          <ol className="space-y-0.5">
            {entries.map((e, i) => {
              const here = at === e.id;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    aria-current={here ? "true" : undefined}
                    onClick={() => {
                      jumpToBlock(e.id);
                      if (covers()) setUI({ tocOpen: false });
                    }}
                    className={`flex w-full items-baseline gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-colors ${
                      here ? "bg-sunk text-ink" : "text-ink-2 hover:bg-sunk/70 hover:text-ink"
                    } ${e.level ? "pl-7" : ""}`}
                  >
                    <span className={`w-4 shrink-0 text-right text-[11.5px] tabular-nums ${here ? "text-[var(--rubric)]" : "text-ink-4"}`}>{i + 1}</span>
                    <span
                      className={`min-w-0 text-pretty ${e.level ? "text-[13.5px] leading-[1.4] text-ink-3" : "font-serif text-[15.5px] leading-[1.35] [font-variation-settings:'opsz'_20]"}`}
                    >
                      {e.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </aside>
  );
}
