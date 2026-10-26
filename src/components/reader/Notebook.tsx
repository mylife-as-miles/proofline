"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, Copy, Download, FileText, X } from "lucide-react";
import { GlossMark } from "@/components/brand/Gloss";
import { cmp } from "@/lib/anchor";
import { notesMarkdown } from "@/lib/export";
import { useGlosses, useHighlights, useStore, type Gloss, type Highlight } from "@/lib/store";
import { NotebookBulkBar } from "./NotebookBulkBar";
import { NotebookFilters } from "./NotebookFilters";
import { GlossEntry, HighlightEntry } from "./NotebookEntry";
import { useReader } from "./context";

type Entry = { kind: "gloss"; g: Gloss; key: string } | { kind: "hl"; h: Highlight; key: string };
type Filter = "all" | "q" | "hl";

const tagsOf = (e: Entry) => (e.kind === "hl" ? e.h.tags : e.g.tags) ?? [];

/** Everything you marked and asked, in reading order, as questions and answers you can scan. */
export function Notebook() {
  const { ix } = useReader();
  const open = useStore((s) => s.notebookOpen);
  const setUI = useStore((s) => s.setUI);
  const glosses = useGlosses(ix.article.id);
  const highlights = useHighlights(ix.article.id);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [starredOnly, setStarredOnly] = useState(false);
  const [tag, setTag] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  /** Picking several entries at once, to export or delete them together. */
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const removeGloss = useStore((s) => s.removeGloss);
  const removeHighlight = useStore((s) => s.removeHighlight);

  const entries = useMemo(() => {
    const pos = (e: Entry) => {
      if (e.kind === "hl") return e.h.anchor.start;
      return e.g.anchor?.start ?? { b: e.g.at ?? ix.article.blocks[0].id, o: 0 };
    };
    const all: Entry[] = [...glosses.map((g) => ({ kind: "gloss" as const, g, key: g.id })), ...highlights.map((h) => ({ kind: "hl" as const, h, key: h.id }))];
    return all.sort((a, b) => cmp(pos(a), pos(b), ix.order));
  }, [glosses, highlights, ix]);

  // Every tag in the notebook, with how many entries carry it, so related entries can be pulled together.
  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) for (const t of tagsOf(e)) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [entries]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !(e.target as HTMLElement).closest("input, textarea")) setUI({ notebookOpen: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setUI]);

  // Closing the notebook puts the picking away with it.
  useEffect(() => {
    if (!open) {
      setPicking(false);
      setPicked([]);
    }
  }, [open]);

  if (!open) return null;

  const both = glosses.length > 0 && highlights.length > 0;
  const isStarred = (e: Entry) => Boolean(e.kind === "hl" ? e.h.starred : e.g.starred);
  const starred = entries.filter(isStarred).length;
  const activeTag = tag && allTags.some(([t]) => t === tag) ? tag : null;
  const shown = entries.filter((e) => {
    if (starredOnly && !isStarred(e)) return false;
    if (activeTag && !tagsOf(e).includes(activeTag)) return false;
    return !both || filter === "all" || (filter === "q" ? e.kind === "gloss" : e.kind === "hl");
  });
  const filtered = starredOnly || Boolean(activeTag);
  const emptyMsg =
    activeTag && starredOnly
      ? `Nothing starred and filed under “${activeTag}”.`
      : activeTag
        ? `Nothing filed under “${activeTag}”.`
        : starredOnly
          ? "Nothing starred here yet. Star an entry to keep it close."
          : "Nothing of that kind here yet.";
  const meta = { title: ix.article.title, author: ix.article.author, published: ix.article.published, url: ix.article.sourceUrl };
  const markdown = () => notesMarkdown(meta, glosses, highlights, ix);
  const allPicked = shown.length > 0 && shown.every((e) => picked.includes(e.key));
  const pickedGlosses = glosses.filter((g) => picked.includes(g.id));
  const pickedHighlights = highlights.filter((h) => picked.includes(h.id));

  const saveMarkdown = (text: string, suffix: string) => {
    const blob = new Blob([text], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${ix.article.title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "notes"}-${suffix}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const togglePicked = (key: string) => setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
  const leavePicking = () => {
    setPicking(false);
    setPicked([]);
  };
  const removePicked = () => {
    for (const g of pickedGlosses) removeGloss(ix.article.id, g.id);
    for (const h of pickedHighlights) removeHighlight(ix.article.id, h.id);
    leavePicking();
  };
  const summary = [
    glosses.length ? `${glosses.length} question${glosses.length === 1 ? "" : "s"}` : "",
    highlights.length ? `${highlights.length} highlight${highlights.length === 1 ? "" : "s"}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <aside
      aria-label="Notebook"
      className="fixed bottom-2.5 left-2.5 right-2.5 top-[calc(var(--topbar-h)+6px)] z-[45] flex flex-col overflow-hidden rounded-[18px] border border-rule bg-raised shadow-pop sm:left-auto sm:w-[420px]"
      style={{ animation: "sheet-in 0.38s var(--ease-out)" }}
    >
      <header className={`shrink-0 border-b px-5 pb-3.5 pt-4 transition-colors duration-200 ${scrolled ? "border-rule" : "border-transparent"}`}>
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-[23px] font-[420] leading-none tracking-[-0.015em] text-ink [font-variation-settings:'opsz'_36]">Notebook</h2>
            <p className="mt-1.5 text-[12.5px] leading-none text-ink-3">{summary || "Empty for now"}</p>
          </div>
          <HeadBtn
            label={copied ? "Copied" : "Copy as Markdown"}
            disabled={!entries.length}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(markdown());
                setCopied(true);
                setTimeout(() => setCopied(false), 1400);
              } catch {}
            }}
          >
            {copied ? <Check size={16} className="text-good" /> : <Copy size={16} />}
          </HeadBtn>
          <HeadBtn label="Download Markdown" disabled={!entries.length} onClick={() => saveMarkdown(markdown(), "notes")}>
            <Download size={16} />
          </HeadBtn>
          <HeadBtn
            label={picking ? "Done picking" : "Pick entries"}
            pressed={picking}
            disabled={!entries.length}
            onClick={() => (picking ? leavePicking() : setPicking(true))}
          >
            <Check size={16} />
          </HeadBtn>
          <span aria-hidden className="mx-1 h-4 w-px bg-rule" />
          <HeadBtn label="Close notebook" onClick={() => setUI({ notebookOpen: false })}>
            <X size={17} />
          </HeadBtn>
        </div>

        {/* Written out, not an icon: the way into a brief can be found without hovering. */}
        <button
          type="button"
          disabled={entries.length < 2}
          onClick={() => setUI({ briefSheetOpen: true, notebookOpen: false })}
          title={entries.length < 2 ? "Mark at least two passages to build a brief" : "Build a brief from what you marked"}
          className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-full border border-rule px-3 text-[12.5px] font-medium text-ink-2 transition-colors hover:border-rule-strong hover:text-ink disabled:pointer-events-none disabled:opacity-40"
        >
          <FileText size={13} aria-hidden /> Build brief
        </button>

        {both && (
          <div role="tablist" aria-label="Show" className="mt-4 grid grid-cols-3 rounded-[10px] bg-sunk p-[3px]">
            {(
              [
                ["all", "All", entries.length],
                ["q", "Questions", glosses.length],
                ["hl", "Highlights", highlights.length],
              ] as const
            ).map(([k, label, count]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={filter === k}
                onClick={() => setFilter(k)}
                className={`flex h-7 items-center justify-center gap-1.5 rounded-[8px] text-[12.5px] font-medium transition-colors ${
                  filter === k ? "bg-pill text-ink shadow-[0_1px_2px_rgb(0_0_0/0.1)]" : "text-ink-3 hover:text-ink"
                }`}
              >
                {label}
                <span className="tabular-nums text-ink-4">{count}</span>
              </button>
            ))}
          </div>
        )}

        {entries.length > 0 && (
          <NotebookFilters
            tags={allTags}
            tag={activeTag}
            starred={starred}
            starredOnly={starredOnly}
            onTag={setTag}
            onStarred={() => setStarredOnly((v) => !v)}
            onClear={() => {
              setStarredOnly(false);
              setTag(null);
            }}
          />
        )}

        {picking && entries.length > 0 && (
          <NotebookBulkBar
            count={picked.length}
            allPicked={allPicked}
            onAll={() => setPicked(allPicked ? [] : shown.map((e) => e.key))}
            onExport={() => saveMarkdown(notesMarkdown(meta, pickedGlosses, pickedHighlights, ix), "selection")}
            onDelete={removePicked}
            onDone={leavePicking}
          />
        )}
      </header>

      {!entries.length ? (
        <div className="flex flex-1 flex-col items-center justify-center px-10 pb-16 text-center">
          <GlossMark className="size-11 text-ink-4" />
          <p className="mt-5 font-serif text-[20px] leading-tight text-ink">Nothing here yet</p>
          <p className="mt-2 max-w-[270px] text-[13.5px] leading-relaxed text-ink-3">
            Select a line and type a question, or highlight it. Every question and answer lands here, in reading order.
          </p>
        </div>
      ) : (
        <div onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 2)} className="scroll-thin flex-1 overflow-y-auto px-3.5 pb-4 pt-0.5">
          {!shown.length ? (
            <div className="flex flex-col items-center px-6 pt-10 text-center">
              <p className="text-[13px] leading-relaxed text-ink-3">{emptyMsg}</p>
              {filtered && (
                <button
                  type="button"
                  onClick={() => {
                    setStarredOnly(false);
                    setTag(null);
                  }}
                  className="mt-3 rounded-full border border-rule px-3 py-1 text-[12px] font-medium leading-none text-ink-3 transition-colors hover:border-rule-strong hover:text-ink"
                >
                  Show everything
                </button>
              )}
            </div>
          ) : (
            <ol className="space-y-2.5">
              {shown.map((e, i) => (
                <li key={e.key} className="rise flex items-start gap-2" style={{ animationDuration: "0.45s", animationDelay: `${Math.min(i, 8) * 35}ms` }}>
                  {picking && (
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={picked.includes(e.key)}
                      aria-label={`Pick entry ${i + 1}`}
                      onClick={() => togglePicked(e.key)}
                      className={`mt-3.5 grid size-5 shrink-0 place-items-center rounded-[6px] border transition-colors ${
                        picked.includes(e.key) ? "border-transparent bg-ink text-bg" : "border-rule text-transparent hover:border-rule-strong"
                      }`}
                    >
                      <Check size={13} strokeWidth={2.6} />
                    </button>
                  )}
                  <div className="min-w-0 flex-1">{e.kind === "hl" ? <HighlightEntry h={e.h} /> : <GlossEntry g={e.g} />}</div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </aside>
  );
}

function HeadBtn({
  label,
  onClick,
  disabled,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      data-tip={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-9 place-items-center rounded-full transition-colors hover:bg-sunk hover:text-ink disabled:pointer-events-none disabled:opacity-35 ${
        pressed ? "bg-sunk text-ink" : "text-ink-3"
      }`}
    >
      {children}
    </button>
  );
}
