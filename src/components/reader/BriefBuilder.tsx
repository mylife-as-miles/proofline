"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, FileText, Loader2, X } from "lucide-react";
import { assembleBrief, collectItems, type Brief } from "@/lib/brief";
import { SAMPLES } from "@/lib/samples";
import { saveBrief, useBriefs } from "@/lib/briefs";
import { useStore } from "@/lib/store";
import { useReader } from "./context";
import { BriefPaper } from "./BriefPaper";

const KIND: Record<string, string> = { highlight: "Highlight", question: "Question", evidence: "Checked" };

/**
 * The brief, built from several texts at once. Pick the passages worth
 * weighing, say what you are trying to work out, and the notebook assembles an
 * argument whose every assertion is tied to the words underneath it.
 */
export function BriefBuilder() {
  const { ix } = useReader();
  const open = useStore((s) => s.briefSheetOpen);
  const setUI = useStore((s) => s.setUI);
  const glosses = useStore((s) => s.glosses);
  const highlights = useStore((s) => s.highlights);
  const library = useStore((s) => s.library);
  const hydrated = useStore((s) => s.hydrated);
  const saved = useBriefs();

  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [focus, setFocus] = useState("");
  const [stage, setStage] = useState<"choose" | "running" | "error" | "brief">("choose");
  const [error, setError] = useState("");
  const [briefId, setBriefId] = useState<string | null>(null);
  // A run that was cancelled or closed must not land later: its result is ignored, and nothing is saved.
  const run = useRef(0);
  const close = useCallback(() => {
    run.current++;
    setUI({ briefSheetOpen: false });
  }, [setUI]);
  // Invalidate on external close and unmount as well as the visible close controls.
  useEffect(() => () => { run.current++; }, [open]);

  const items = useMemo(() => {
    const titles: Record<string, string> = {};
    for (const s of SAMPLES) titles[s.id] = s.title;
    for (const l of library) titles[l.id] = l.title;
    titles[ix.article.id] = ix.article.title;
    return collectItems({ glosses, highlights, titles });
  }, [glosses, highlights, library, ix.article.id, ix.article.title]);

  // Opening starts a fresh choice, with what was kept or checked already ticked.
  useEffect(() => {
    if (!open) return;
    const preferred = items.filter((i) => i.starred);
    const seed = preferred.length ? preferred : items.filter((i) => i.kind === "evidence").length ? items.filter((i) => i.kind === "evidence") : items;
    setPicked(Object.fromEntries(seed.map((i) => [i.key, true])));
    setStage("choose");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      close();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, close]);

  if (!open) return null;

  const chosen = items.filter((i) => picked[i.key]);
  const texts = new Set(chosen.map((i) => i.articleId));
  const brief = saved.find((b) => b.id === briefId);

  const cancel = () => {
    run.current++;
    setError("");
    setStage("choose");
  };

  const build = async () => {
    const mine = ++run.current;
    setStage("running");
    setError("");
    try {
      const b: Brief = await assembleBrief(chosen, focus.trim());
      if (mine !== run.current) return;
      saveBrief(b);
      setBriefId(b.id);
      setStage("brief");
    } catch (e) {
      if (mine !== run.current) return;
      setError(e instanceof Error ? e.message : "The brief could not be assembled.");
      setStage("error");
    }
  };

  const groups = [...new Map(items.map((i) => [i.articleId, { id: i.articleId, title: i.articleTitle }])).values()];

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/25 p-2 backdrop-blur-[2px] sm:p-6" style={{ animation: "fade 0.2s" }} onClick={close}>
      <div
        role="dialog"
        aria-label="Brief"
        className="pop flex max-h-[min(94dvh,860px)] w-full max-w-[760px] flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start gap-2 border-b border-rule px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 font-serif text-[20px] leading-none text-ink">
              <FileText size={16} strokeWidth={1.8} className="text-rubric-text" aria-hidden /> Brief
            </h2>
            <p className="mt-1.5 text-[12px] leading-snug text-ink-3">An argument assembled from what you marked, across texts — with every claim tied to its source.</p>
          </div>
          <button
            type="button"
            aria-label="Close brief"
            onClick={close}
            className="grid size-8 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-sunk hover:text-ink"
          >
            <X size={17} />
          </button>
        </header>

        {stage === "brief" && brief ? (
          <BriefPaper brief={brief} onReset={() => setStage("choose")} onClose={close} />
        ) : stage === "running" ? (
          <div aria-busy className="flex min-h-[260px] flex-1 flex-col justify-center px-6 py-10">
            <p key="run" className="flex items-center gap-2 text-[13px] font-medium text-rubric-text" style={{ animation: "rise 0.4s var(--ease-out) both" }}>
              <Loader2 size={14} className="animate-spin" aria-hidden /> Weighing {chosen.length} passages across {texts.size} text{texts.size === 1 ? "" : "s"}
            </p>
            <p className="mt-2 text-[12.5px] leading-snug text-ink-3">Only the passages you picked are read. Every quotation is then checked against the stored words.</p>
            <div className="mt-6 space-y-2.5" aria-hidden>
              <div className="shimmer h-3.5 w-[92%]" />
              <div className="shimmer h-3.5 w-[84%]" />
              <div className="shimmer h-3.5 w-[64%]" />
            </div>
            <button
              type="button"
              onClick={cancel}
              className="mt-6 inline-flex h-9 w-fit items-center gap-1.5 rounded-full border border-rule px-3.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:border-rule-strong hover:text-ink"
            >
              <X size={13} /> Cancel — nothing is kept
            </button>
          </div>
        ) : (
          <>
            <div className="scroll-thin flex-1 overflow-y-auto px-4 pb-4 pt-3.5 sm:px-5">
              {stage === "error" && (
                <div className="mb-3 flex flex-wrap items-center gap-3 rounded-[12px] border border-rule px-3.5 py-2.5 text-[13px]">
                  <p className="text-rubric-text">{error}</p>
                  <button type="button" onClick={build} className="font-medium text-ink underline decoration-rule-strong underline-offset-4">
                    Try again
                  </button>
                </div>
              )}

              {saved.length > 0 && (
                <section aria-label="Saved briefs" className="mb-4">
                  <h3 className="text-[11px] uppercase tracking-[0.1em] text-ink-4">Your briefs</h3>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {saved.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setBriefId(b.id);
                          setStage("brief");
                        }}
                        className="max-w-[240px] truncate rounded-full border border-rule px-2.5 py-1 text-[12px] text-ink-2 transition-colors hover:border-rule-strong hover:text-ink"
                      >
                        {b.title}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.1em] text-ink-4">What are you trying to work out?</span>
                <input
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  placeholder="Optional — what should it answer?"
                  className="mt-1.5 h-9 w-full rounded-[10px] border border-rule bg-bg px-3 text-[13.5px] text-ink outline-none transition-colors placeholder:text-ink-4 focus:border-rule-strong"
                />
              </label>

              {!hydrated ? (
                <p className="mt-6 text-[13px] text-ink-3">Reading your notebook…</p>
              ) : !items.length ? (
                <p className="mt-6 text-[13px] leading-relaxed text-ink-3">
                  Nothing marked yet. Highlight a passage or ask a question in any text, then come back — a brief is made from those.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {groups.map((g) => {
                    const group = items.filter((i) => i.articleId === g.id);
                    const all = group.every((i) => picked[i.key]);
                    return (
                      <section key={g.id} aria-label={g.title}>
                        <div className="flex items-center gap-2 border-b border-rule pb-1.5">
                          <h3 className="min-w-0 flex-1 truncate font-serif text-[15px] leading-none text-ink">{g.title}</h3>
                          <span className="text-[11px] tabular-nums text-ink-4">{group.length}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setPicked((p) => {
                                const next = { ...p };
                                for (const i of group) next[i.key] = !all;
                                return next;
                              })
                            }
                            className="text-[11.5px] font-medium text-ink-3 transition-colors hover:text-ink"
                          >
                            {all ? "None" : "All"}
                          </button>
                        </div>
                        <ul className="mt-1.5 space-y-1">
                          {group.map((i) => {
                            const on = Boolean(picked[i.key]);
                            return (
                              <li key={i.key}>
                                <button
                                  type="button"
                                  role="checkbox"
                                  aria-checked={on}
                                  onClick={() => setPicked((p) => ({ ...p, [i.key]: !on }))}
                                  className={`flex w-full items-start gap-2.5 rounded-[10px] border px-2.5 py-2 text-left transition-colors ${
                                    on ? "border-rule-strong bg-bg" : "border-transparent hover:bg-sunk"
                                  }`}
                                >
                                  <span
                                    aria-hidden
                                    className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-[5px] border transition-colors ${
                                      on ? "border-transparent bg-ink text-bg" : "border-rule text-transparent"
                                    }`}
                                  >
                                    <Check size={11} strokeWidth={3} />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="line-clamp-2 font-serif text-[13.5px] leading-[1.45] text-ink">“{i.quote}”</span>
                                    <span className="mt-0.5 flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.06em] text-ink-4">
                                      {KIND[i.kind]}
                                      {i.starred && <span aria-label="kept">· kept</span>}
                                    </span>
                                    {i.note && <span className="mt-0.5 block line-clamp-1 text-[11.5px] text-ink-3">{i.note}</span>}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              )}
            </div>

            <footer className="flex shrink-0 items-center gap-2 border-t border-rule px-4 py-2.5 sm:px-5">
              <button type="button" onClick={close} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium text-ink-3 hover:bg-sunk hover:text-ink">
                <ArrowLeft size={13} /> Back
              </button>
              <span className="ml-auto text-[11.5px] tabular-nums text-ink-4">
                {chosen.length} passage{chosen.length === 1 ? "" : "s"} · {texts.size} text{texts.size === 1 ? "" : "s"}
                {texts.size === 1 && chosen.length >= 2 ? " · add another text to compare" : ""}
              </span>
              <button
                type="button"
                disabled={chosen.length < 2}
                onClick={build}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-bg transition-transform active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100"
              >
                Assemble brief
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
