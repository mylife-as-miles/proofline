"use client";

import Link from "@/platform/link";
import { useRouter } from "@/platform/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen as FullModeIcon, ChevronLeft, ChevronRight } from "lucide-react";
import HTMLFlipBook from "react-pageflip";
import { displayArticle, type Article } from "@/lib/article";
import { paginate, type FlipLeaf } from "@/lib/flipPages";
import { applySettings } from "@/lib/settings";
import { loadDoc, useStore } from "@/lib/store";
import { fetchText } from "@/lib/sync";
import Leaf from "./FlipPage";

type Geo = { w: number; h: number; pad: number; spread: boolean };

function measure(twoUp: boolean): Geo {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // A short window — a phone turned sideways — gets a shorter book, so the leaves still fit under the header.
  const room = Math.max(200, vh - 150);
  const wide = vw >= 900 || (vw > vh && vw >= 620);
  const spread = twoUp && wide;
  const h = Math.round(Math.min(room, 760));
  const w = Math.round(spread ? Math.min(h * 0.72, (vw - 140) / 2) : Math.min(h * 0.7, vw - 44));
  const pad = spread ? Math.max(20, Math.min(38, Math.round(w * 0.1))) : Math.max(16, Math.min(24, Math.round(w * 0.06)));
  return { w, h, pad, spread };
}

/** The text as a bound book: real leaves you can turn, and a way into the full reader. */
export function FlipBook({ id, initial }: { id: string; initial: Article | null }) {
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(initial);
  const [missing, setMissing] = useState(false);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [leaves, setLeaves] = useState<FlipLeaf[]>([]);
  const [page, setPage] = useState(0);

  const bookRef = useRef<{ pageFlip: () => any } | null>(null);
  const flippedRef = useRef(false);
  const hydrate = useStore((s) => s.hydrate);
  const hydrated = useStore((s) => s.hydrated);
  const setProgress = useStore((s) => s.setProgress);
  const twoUp = useStore((s) => s.settings.spread);
  const savedAt = useStore((s) => s.progress[id]?.block);
  const [first, setFirst] = useState(0);

  useEffect(() => {
    hydrate();
    applySettings(useStore.getState().settings);
    if (initial) return;
    void loadDoc(id)
      .then((a) => a ?? fetchText(id))
      .then((a) => (a ? setArticle(a) : setMissing(true)));
  }, [hydrate, id, initial]);

  // The leaves follow the window, and whether the book is set as a spread; the book is remounted when the measure changes.
  useEffect(() => {
    const set = () => setGeo(measure(twoUp));
    set();
    let t: ReturnType<typeof setTimeout>;
    const later = () => {
      clearTimeout(t);
      t = setTimeout(set, 180);
    };
    window.addEventListener("resize", later);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", later);
    };
  }, [twoUp]);

  // The leaves are measured in the real type, so the book is laid out once the
  // book face has actually loaded — otherwise the pages hold more than they fit.
  useEffect(() => {
    if (!geo || !article) return;
    let live = true;
    const set = () => {
      if (!live) return;
      const shown = displayArticle(article);
      setLeaves(paginate(shown.blocks, geo.w - geo.pad * 2, geo.h - geo.pad * 2 - 26));
    };
    set();
    void document.fonts?.ready.then(set).catch(() => {});
    return () => {
      live = false;
    };
  }, [article, geo]);

  // Open where the reader stopped, and keep that page through re-pagination
  // until they turn a leaf themselves.
  useEffect(() => {
    if (!hydrated || !leaves.length || flippedRef.current) return;
    const at = savedAt ? leaves.findIndex((l) => l.block === savedAt) : -1;
    const page = at >= 0 ? at + 1 : 0;
    setFirst(page);
    setPage(page);
  }, [hydrated, leaves, savedAt]);

  const shown = article ? displayArticle(article) : null;

  const turn = useCallback(
    (e: { data: number }) => {
      flippedRef.current = true;
      setPage(e.data);
      const leaf = leaves[e.data - 1];
      if (leaf) setProgress(id, { block: leaf.block, pct: leaf.pct, at: Date.now() });
    },
    [id, leaves, setProgress]
  );

  const next = useCallback(() => bookRef.current?.pageFlip()?.flipNext(), []);
  const prev = useCallback(() => bookRef.current?.pageFlip()?.flipPrev(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") router.push("/library");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, router]);

  if (missing)
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <p className="font-serif text-[26px] text-ink">This text is not on this device.</p>
          <Link href="/library" className="mt-6 inline-flex h-10 items-center rounded-full bg-ink px-5 text-[14px] font-medium text-bg">
            Back to the library
          </Link>
        </div>
      </main>
    );

  if (!shown || !geo || !leaves.length || !hydrated)
    return (
      <main className="grid min-h-dvh place-items-center bg-sunk">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-4 border-t-ink" />
      </main>
    );

  const total = leaves.length;

  return (
    <main className="flex min-h-dvh flex-col bg-sunk text-ink">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-rule bg-bg/85 px-4 backdrop-blur md:px-6">
        <Link href="/library" className="inline-flex min-h-10 shrink-0 items-center gap-1 px-1 text-[13px] text-ink-3 transition-colors hover:text-ink sm:min-h-9 sm:px-0">
          <ChevronLeft size={16} />
          Library
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-serif text-[14px] text-ink">{shown.title}</p>
          {shown.author && <p className="truncate text-[11.5px] text-ink-3">{shown.author}</p>}
        </div>
        <span className="hidden text-[12px] tabular-nums text-ink-3 sm:block">
          {Math.min(Math.max(page, 1), total)} / {total}
        </span>
        <Link
          href={`/read/${id}`}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-rule-strong px-3.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:border-ink-4 hover:text-ink sm:h-9"
        >
          <FullModeIcon size={14} />
          Full mode
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center gap-2 px-2 py-5 md:gap-5">
        <button
          type="button"
          onClick={prev}
          aria-label="Previous page"
          className="hidden h-10 w-10 shrink-0 place-items-center rounded-full border border-rule bg-bg text-ink-2 transition-colors hover:border-ink-4 hover:text-ink md:grid"
        >
          <ChevronLeft size={17} />
        </button>

        <div
          style={{
            width: geo.spread ? geo.w * 2 : geo.w,
            height: geo.h,
            ["--flip-pad" as string]: `${geo.pad}px`,
          }}
        >
          <HTMLFlipBook
            key={`${geo.w}x${geo.h}-${leaves.length}-${first}`}
            ref={bookRef as never}
            className="flip-book"
            style={{}}
            startPage={first}
            size="fixed"
            width={geo.w}
            height={geo.h}
            minWidth={geo.w}
            maxWidth={geo.w}
            minHeight={geo.h}
            maxHeight={geo.h}
            drawShadow
            flippingTime={680}
            maxShadowOpacity={0.3}
            showCover
            mobileScrollSupport={false}
            // A finger or a mouse both turn the leaves: swipe, drag a corner, click.
            useMouseEvents
            swipeDistance={36}
            showPageCorners
            onFlip={turn}
          >
            <Leaf pad={geo.pad} className="flip-cover">
              <div className="flip-cover-in">
                <p className="flip-kicker">A Proofline reader</p>
                <div className="flip-mid">
                  <h1 className="flip-cover-title">{shown.title}</h1>
                  {shown.author && <p className="flip-cover-by">{shown.author}</p>}
                </div>
                <p className="flip-kicker">Turn the corner to begin</p>
              </div>
            </Leaf>

            {leaves.map((leaf, i) => (
              <Leaf key={i} pad={geo.pad}>
                <div className="flip-body" dangerouslySetInnerHTML={{ __html: leaf.html }} />
                <span className="flip-folio">{i + 1}</span>
              </Leaf>
            ))}

            <Leaf pad={geo.pad} className="flip-cover">
              <div className="flip-cover-in">
                <div className="flip-mid">
                  <p className="flip-kicker">The end</p>
                  <h1 className="flip-cover-title">{shown.title}</h1>
                </div>
                <Link href={`/read/${id}`} className="flip-end-link">
                  Read it in full
                  <FullModeIcon size={14} />
                </Link>
              </div>
            </Leaf>
          </HTMLFlipBook>
        </div>

        <button
          type="button"
          onClick={next}
          aria-label="Next page"
          className="hidden h-10 w-10 shrink-0 place-items-center rounded-full border border-rule bg-bg text-ink-2 transition-colors hover:border-ink-4 hover:text-ink md:grid"
        >
          <ChevronRight size={17} />
        </button>
      </div>

      <p className="pb-4 text-center text-[11.5px] text-ink-3 md:hidden">Swipe or tap a corner to turn the page</p>
    </main>
  );
}
