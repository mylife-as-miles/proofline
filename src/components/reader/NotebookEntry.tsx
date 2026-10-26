"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy, Pencil, Star, Tag, Trash2, X } from "lucide-react";
import { ACTIONS } from "@/lib/actions";
import { stopGloss } from "@/lib/ask";
import { entryMarkdown, pairsOf } from "@/lib/export";
import { useStore, type Gloss, type Highlight, type Turn } from "@/lib/store";
import { Answer, Sources } from "./Answer";
import { EvidenceSources } from "./EvidenceList";
import { NoteBox, Tool } from "./NoteTools";
import { TagBox, TagList } from "./Tags";
import { Writing } from "./Writing";
import { useReader } from "./context";

/** Below this width the notebook covers the margin, so it steps aside when you jump to a passage. */
const covers = () => window.innerWidth < 1900;

function ago(t: number) {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function Meta({ n, label, at }: { n?: number; label?: string; at: number }) {
  return (
    <span className="flex items-center gap-2 text-[11.5px] leading-none text-ink-3">
      {n !== undefined && <span className="cite pointer-events-none !m-0 !text-[11px]">¶{n}</span>}
      {label && <span className="font-medium text-ink-2">{label}</span>}
      <span className="text-ink-4">{ago(at)}</span>
    </span>
  );
}

function StarTool({ on, toggle }: { on?: boolean; toggle: () => void }) {
  return (
    <Tool label={on ? "Unstar" : "Star"} pressed={on} onClick={toggle}>
      <Star size={14} className={on ? "fill-current" : ""} />
    </Tool>
  );
}

/** Copies this one entry as Markdown, with a tick for a moment. */
function CopyTool({ make }: { make: () => string }) {
  const [done, setDone] = useState(false);
  return (
    <Tool
      label={done ? "Copied" : "Copy as Markdown"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(make());
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        } catch {}
      }}
    >
      {done ? <Check size={14} className="text-good" /> : <Copy size={14} />}
    </Tool>
  );
}

/** The row under an entry: star it, write on it, copy it, or throw it away. */
function Row({ children }: { children: ReactNode }) {
  return <div className="mt-2.5 flex items-center gap-0.5">{children}</div>;
}

/** Your own note, as it reads once written. */
function Note({ text }: { text: string }) {
  return <p className="mt-3 whitespace-pre-line rounded-[10px] bg-sunk px-3 py-2 text-[13.5px] leading-[1.55] text-ink-2">{text}</p>;
}

/** One tag off an entry, the list gone when the last one goes. */
function dropTag(tags: string[] | undefined, gone: string) {
  const left = (tags ?? []).filter((t) => t !== gone);
  return left.length ? left : undefined;
}

export function GlossEntry({ g }: { g: Gloss }) {
  const { ix, jumpToBlock } = useReader();
  const setUI = useStore((s) => s.setUI);
  const removeGloss = useStore((s) => s.removeGloss);
  const updateGloss = useStore((s) => s.updateGloss);
  const [noting, setNoting] = useState(false);
  const [tagging, setTagging] = useState(false);
  const blockId = g.anchor?.start.b ?? g.at;
  const n = blockId ? ix.numbers.get(blockId) : undefined;
  const label = !g.anchor ? "Whole text" : g.action === "ask" ? undefined : ACTIONS[g.action].label;
  const go = () => {
    setUI({ activeGloss: g.id, ...(covers() ? { notebookOpen: false } : {}) });
    if (blockId) jumpToBlock(blockId);
  };

  return (
    <article className="group rounded-[14px] border border-rule bg-bg px-4 pb-2 pt-3.5 transition-colors hover:border-rule-strong">
      <button type="button" onClick={go} className="block w-full text-left">
        <Meta n={n} label={label} at={g.createdAt} />
        {g.anchor && (
          <span className="mt-2.5 line-clamp-2 border-l-2 border-[var(--rubric-line)] pl-3 font-serif text-[15px] leading-[1.45] text-ink-3 transition-colors group-hover:text-ink-2">
            {g.anchor.quote}
          </span>
        )}
      </button>

      <div className="mt-3.5 space-y-4">
        {pairsOf(g).map((p, i) => (
          <div key={i} className={i > 0 ? "border-t border-rule pt-3.5" : ""}>
            <div className="grid grid-cols-[16px_minmax(0,1fr)] items-baseline gap-x-2">
              <span aria-hidden className="text-[11.5px] font-semibold leading-none text-rubric-text">Q</span>
              <p className="font-serif text-[16.5px] leading-[1.35] text-ink [font-variation-settings:'opsz'_24]">{p.q}</p>
            </div>
            <div className="mt-2 grid grid-cols-[16px_minmax(0,1fr)] items-baseline gap-x-2">
              <span aria-hidden className="text-[11.5px] font-semibold leading-none text-ink-4">A</span>
              <div className="min-w-0">
                <AnswerBody t={p.a} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {g.evidence && <EvidenceSources findings={g.evidence.findings} />}
      {g.note && !noting && <Note text={g.note} />}
      {noting && (
        <NoteBox
          value={g.note}
          placeholder="Your note on this…"
          onSave={(note) => {
            updateGloss(g.articleId, g.id, (x) => ({ ...x, note }));
            setNoting(false);
          }}
          onClose={() => setNoting(false)}
        />
      )}

      <TagList tags={g.tags} onRemove={(t) => updateGloss(g.articleId, g.id, (x) => ({ ...x, tags: dropTag(x.tags, t) }))} />
      {tagging && (
        <TagBox tags={g.tags} onChange={(tags) => updateGloss(g.articleId, g.id, (x) => ({ ...x, tags }))} onClose={() => setTagging(false)} />
      )}

      <Row>
        <StarTool on={g.starred} toggle={() => updateGloss(g.articleId, g.id, (x) => ({ ...x, starred: !x.starred || undefined }))} />
        <Tool label={g.note ? "Edit note" : "Add a note"} onClick={() => setNoting((v) => !v)}>
          <Pencil size={14} />
        </Tool>
        <Tool label={g.tags?.length ? "Edit tags" : "Add tags"} pressed={tagging} onClick={() => setTagging((v) => !v)}>
          <Tag size={14} />
        </Tool>
        <CopyTool make={() => entryMarkdown({ kind: "gloss", g }, ix)} />
        <span aria-hidden className="flex-1" />
        <Tool
          label="Delete"
          onClick={() => {
            stopGloss(g.id);
            removeGloss(g.articleId, g.id);
          }}
        >
          <Trash2 size={14} />
        </Tool>
      </Row>
    </article>
  );
}

export function HighlightEntry({ h }: { h: Highlight }) {
  const { ix, jumpToBlock } = useReader();
  const removeHighlight = useStore((s) => s.removeHighlight);
  const updateHighlight = useStore((s) => s.updateHighlight);
  const setUI = useStore((s) => s.setUI);
  const [noting, setNoting] = useState(false);
  const [tagging, setTagging] = useState(false);

  return (
    <article className="rounded-[14px] border border-rule bg-bg px-4 pb-2 pt-3.5 transition-colors hover:border-rule-strong">
      <button
        type="button"
        onClick={() => {
          if (covers()) setUI({ notebookOpen: false });
          jumpToBlock(h.anchor.start.b);
        }}
        className="block w-full text-left"
      >
        <Meta n={ix.numbers.get(h.anchor.start.b)} label={h.note ? "Note" : "Highlight"} at={h.createdAt} />
        <span className="mt-2.5 block font-serif text-[15.5px] leading-[1.5] text-ink">
          <mark className="m-hl text-inherit" data-c={h.color && h.color !== "yellow" ? h.color : undefined}>
            {h.anchor.quote}
          </mark>
        </span>
      </button>

      {h.note && !noting && <Note text={h.note} />}
      {noting && (
        <NoteBox
          value={h.note}
          placeholder="Your note on this passage…"
          onSave={(note) => {
            updateHighlight(ix.article.id, h.id, { note });
            setNoting(false);
          }}
          onClose={() => setNoting(false)}
        />
      )}

      <TagList tags={h.tags} onRemove={(t) => updateHighlight(ix.article.id, h.id, { tags: dropTag(h.tags, t) })} />
      {tagging && (
        <TagBox tags={h.tags} onChange={(tags) => updateHighlight(ix.article.id, h.id, { tags })} onClose={() => setTagging(false)} />
      )}

      <Row>
        <StarTool on={h.starred} toggle={() => updateHighlight(ix.article.id, h.id, { starred: !h.starred || undefined })} />
        <Tool label={h.note ? "Edit note" : "Add a note"} onClick={() => setNoting((v) => !v)}>
          <Pencil size={13.5} />
        </Tool>
        <Tool label={h.tags?.length ? "Edit tags" : "Add tags"} pressed={tagging} onClick={() => setTagging((v) => !v)}>
          <Tag size={13.5} />
        </Tool>
        <CopyTool make={() => entryMarkdown({ kind: "hl", h }, ix)} />
        <span aria-hidden className="flex-1" />
        <Tool label="Remove" onClick={() => removeHighlight(ix.article.id, h.id)}>
          <X size={14} />
        </Tool>
      </Row>
    </article>
  );
}

function AnswerBody({ t }: { t?: Turn }) {
  if (!t || (t.streaming && !t.content)) {
    return <Writing />;
  }
  if (t.error && !t.content) return <p className="text-[13.5px] text-rubric-text">{t.error}</p>;
  return (
    <Clamp watch={t.content}>
      <Answer text={t.content} streaming={t.streaming} sources={t.sources} />
      {!t.streaming && t.sources?.length ? <Sources sources={t.sources} /> : null}
    </Clamp>
  );
}

/** Long answers fold to five lines; one click opens the rest. */
function Clamp({ watch, children }: { watch: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [over, setOver] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && !open) setOver(el.scrollHeight > el.clientHeight + 2);
  }, [watch, open]);
  return (
    <>
      <div ref={ref} className={`gloss-body !text-[14px] !leading-[1.55] text-ink-2 ${open ? "" : "nb-clamp"} ${!open && over ? "is-over" : ""}`}>
        {children}
      </div>
      {(over || open) && (
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-1.5 text-[12.5px] font-medium text-ink-3 transition-colors hover:text-ink">
          {open ? "Show less" : "Read the whole answer"}
        </button>
      )}
    </>
  );
}
