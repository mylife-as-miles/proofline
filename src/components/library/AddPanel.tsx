"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, BookmarkPlus, Check, Copy, Loader2, Plus, X } from "lucide-react";
import { importFromUrl, keep, looksLikeUrl } from "@/lib/import";
import { normalizeUrl } from "@/lib/links";
import { useStore } from "@/lib/store";
import { MarkStack } from "./AgentMarks";
import { Glyph } from "./Book";

export type AddTab = "links";

/**
 * Adding to the library: paste links, one or many.
 */
export function AddPanel({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", key);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[80]" role="presentation">
      <div className="absolute inset-0 bg-ink/20 backdrop-blur-[2px]" style={{ animation: "fade 0.2s both" }} onClick={onClose} />
      <section role="dialog" aria-modal aria-label="Add to the library" className="add-panel">
        <header className="flex items-center justify-between gap-3">
          <p className="font-serif text-[19px] leading-tight text-ink">Add articles</p>
          <button type="button" aria-label="Close" data-tip="Close" data-tip-kbd="Esc" onClick={onClose} className="grid size-9 place-items-center rounded-full text-ink-3 transition-colors hover:bg-sunk hover:text-ink">
            <X size={17} />
          </button>
        </header>
        <Links />
      </section>
    </div>,
    document.body
  );
}

/**
 * What opens the panel: plain about adding articles, and the plus turns.
 */
export function AddButton({ onClick, compact }: { onClick: () => void; compact?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`lib-add${compact ? " is-compact" : ""}`}>
      <MarkStack size={compact ? 22 : 26} />
      <span className="min-w-0 text-left">
        <span className="lib-add-title">Add articles</span>
        {!compact && <span className="lib-add-sub">Paste a link, or several</span>}
      </span>
      {!compact && (
        <span className="lib-add-plus" aria-hidden>
          <Plus size={15} strokeWidth={2.2} />
        </span>
      )}
    </button>
  );
}

/* ---------- links ---------- */

type Row = { url: string; state: "waiting" | "reading" | "saved" | "already" | "failed"; title?: string; error?: string };

/** How many links one Save reads in. A Pocket export can hold thousands; the rest wait in the box for the next Save. */
const BATCH = 100;

/** Every web link in an export: Pocket, Instapaper and Raindrop CSVs, Pocket's HTML, or a plain list. */
function linksIn(text: string): string[] {
  const found = text.match(/https?:\/\/[^\s"'<>,]+/gi) ?? [];
  return [...new Set(found.map((u) => u.replace(/[).;\]]+$/, "")))];
}

function Links() {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);

  const urls = [...new Set(text.split(/[\s,]+/).map((s) => s.trim()).filter(looksLikeUrl))];

  const fromExport = async (f: File) => {
    const found = linksIn(await f.text().catch(() => ""));
    if (!found.length) return setNote(`No links found in ${f.name}.`);
    setText((cur) => [cur.trim(), ...found].filter(Boolean).join("\n"));
    setNote(`Found ${found.length} link${found.length === 1 ? "" : "s"} in ${f.name}.`);
  };

  const save = async () => {
    if (!urls.length || busy) return;
    setBusy(true);
    const have = new Set(useStore.getState().library.flatMap((x) => (x.sourceUrl ? [normalizeUrl(x.sourceUrl)] : [])));
    const all: Row[] = urls.map((url) => ({ url, state: have.has(normalizeUrl(url)) ? "already" : "waiting" }));
    const fresh = all.filter((r) => r.state === "waiting");
    const known = all.length - fresh.length;
    const rest = fresh.slice(BATCH).map((r) => r.url);
    // A long export lists only what is being read now; a short paste shows every link, saved before or not.
    const list = all.length > BATCH ? fresh.slice(0, BATCH) : all;
    setRows(list);
    setText(rest.join("\n"));
    setNote(
      all.length > BATCH
        ? [rest.length ? `Saving ${BATCH} now; ${rest.length} more wait above for the next Save.` : `Saving ${fresh.length}.`, known ? `${known} already in your library.` : ""].filter(Boolean).join(" ")
        : null
    );
    const set = (i: number, r: Partial<Row>) => setRows((cur) => cur.map((x, j) => (j === i ? { ...x, ...r } : x)));
    const todo = list.map((r, i) => ({ r, i })).filter((x) => x.r.state === "waiting");
    const next = async () => {
      for (let x = todo.shift(); x; x = todo.shift()) {
        set(x.i, { state: "reading" });
        const r = await importFromUrl(x.r.url, (_, label) => label && set(x!.i, { title: label }));
        const err = r.ok ? await keep(r.article, r.file) : r.error;
        set(x.i, err ? { state: "failed", error: err, title: undefined } : { state: "saved", title: r.ok ? r.article.title : undefined });
      }
    };
    // A few at a time, so a slow site never holds the rest up.
    await Promise.all([next(), next(), next()]);
    setBusy(false);
  };

  return (
    <div className="mt-5">
      <p className="text-[19px] font-serif leading-tight text-ink">Save links to your library</p>
      <p className="mt-1 text-[13px] text-ink-3">
        One or many, a line each. Proofline reads each page in and sorts it onto a topic. PDFs work too. Leaving Pocket, Instapaper or Raindrop?{" "}
        <button type="button" onClick={() => fileRef.current?.click()} className="text-ink-2 underline decoration-rule-strong underline-offset-2 hover:text-ink">
          Drop its export here
        </button>
        .
      </p>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.html,.htm,.txt,.json,text/csv,text/html,text/plain,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void fromExport(f);
          e.target.value = "";
        }}
      />
      <textarea
        ref={ref}
        value={text}
        onDragOver={(e) => {
          if (!Array.from(e.dataTransfer.types).includes("Files")) return;
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          const f = e.dataTransfer.files?.[0];
          setOver(false);
          if (!f) return;
          e.preventDefault();
          void fromExport(f);
        }}
        style={over ? { borderColor: "var(--rubric)", borderStyle: "dashed" } : undefined}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void save();
          }
        }}
        placeholder={"https://paulgraham.com/greatwork.html\nhttps://..."}
        rows={4}
        className="add-text"
        aria-label="Links to save"
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[12.5px] text-ink-4">{urls.length ? `${urls.length} link${urls.length === 1 ? "" : "s"}` : text.trim() ? "No links found yet" : ""}</span>
        <button type="button" onClick={save} disabled={!urls.length || busy} className="add-btn">
          {busy && <Loader2 size={14} className="animate-spin" />}
          {busy ? "Saving" : urls.length > 1 ? `Save ${Math.min(urls.length, BATCH)}` : "Save"}
        </button>
      </div>
      {note && <p className="mt-2 text-[12.5px] text-ink-3">{note}</p>}
      {rows.length > 0 && (
        <ul className="add-rows scroll-thin">
          {rows.map((r) => (
            <li key={r.url} data-state={r.state}>
              <span className="add-dot" aria-hidden>
                {r.state === "reading" ? <Loader2 size={13} className="animate-spin" /> : r.state === "saved" || r.state === "already" ? <Check size={13} /> : r.state === "failed" ? <X size={13} /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] text-ink">{r.title ?? r.url.replace(/^https?:\/\/(www\.)?/, "")}</span>
                <span className="block truncate text-[12px] text-ink-3">
                  {r.state === "saved" ? "On the shelf" : r.state === "already" ? "Already in your library" : r.state === "failed" ? r.error : r.state === "reading" ? "Reading" : "Waiting"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <Bookmarklets />
    </div>
  );
}

/**
 * Bookmarklets: one click on any page opens it in Gloss, in a new tab, to read now
 * or to shelve for later (`/?url=` and `/?save=` on the home page).
 */
function Bookmarklets() {
  const readRef = useRef<HTMLAnchorElement>(null);
  const saveRef = useRef<HTMLAnchorElement>(null);
  const [origin, setOrigin] = useState("https://usegloss.io");
  const code = (param: "url" | "save") => `javascript:void(window.open('${origin}/?${param}='+encodeURIComponent(location.href)))`;
  useEffect(() => setOrigin(window.location.origin), []);
  // React refuses javascript: links in JSX, so they are set by hand.
  useEffect(() => {
    readRef.current?.setAttribute("href", code("url"));
    saveRef.current?.setAttribute("href", code("save"));
  });
  const pill = "inline-flex cursor-grab items-center gap-1.5 rounded-full border border-rule-strong bg-bg px-3 py-1.5 text-[13px] font-medium text-ink shadow-[var(--shadow-card)] active:cursor-grabbing";
  return (
    <div className="mt-6 border-t border-rule pt-5">
      <p className="lib-label">From any page</p>
      <p className="mt-1 text-[13px] text-ink-3">Drag one to your bookmarks bar, then click it on any article.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a ref={readRef} onClick={(e) => e.preventDefault()} data-tip="Drag me to your bookmarks bar" className={pill}>
          <BookOpen size={14} className="text-ink-3" /> Read in Proofline
        </a>
        <a ref={saveRef} onClick={(e) => e.preventDefault()} data-tip="Drag me to your bookmarks bar" className={pill}>
          <BookmarkPlus size={14} className="text-ink-3" /> Save to Proofline
        </a>
      </div>
      <details className="mt-3 text-[12.5px] text-ink-3">
        <summary className="cursor-pointer select-none hover:text-ink-2">On a phone</summary>
        <div className="mt-2">
          <CopyBlock title="Bookmark any page, then edit the bookmark" body="Paste this as its address and name it Save to Proofline." text={code("save")} />
        </div>
      </details>
    </div>
  );
}

/* A snippet with a copy button. */
function CopyBlock({ title, body, text }: { title: string; body: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-[14px] border border-rule bg-bg p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-ink">{title}</p>
          <p className="text-[12px] text-ink-3">{body}</p>
        </div>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            } catch {}
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sunk px-2.5 py-1 text-[12px] font-medium text-ink-2 transition-colors hover:text-ink"
        >
          {copied ? <Check size={12} className="text-good" /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-sunk px-2.5 py-2 text-[11.5px] leading-relaxed text-ink-2">{text}</pre>
    </div>
  );
}
