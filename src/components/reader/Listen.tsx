"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight, Headphones, Loader2, Pause, Play, X } from "lucide-react";
import { listen, useListen } from "@/lib/listen";
import { useStore } from "@/lib/store";
import { barBtn } from "@/components/ui/Popover";
import { useReader } from "./context";

/**
 * Listening, on Kokoro: the voice model runs in this browser, so nothing is
 * sent to a server and nothing needs a key. Off until it is turned on in
 * Appearance; the button then joins the top bar and the bar follows along.
 */
export function ListenButton({ from }: { from: () => string | null }) {
  const { ix } = useReader();
  const wanted = useStore((s) => s.settings.listen);
  const on = useListen((s) => s.on);
  const playing = useListen((s) => s.playing);
  const busy = useListen((s) => s.busy);
  if (!wanted) return null;

  const label = on && playing ? "Pause listening" : on ? "Carry on listening" : "Listen to this text";
  return (
    <button
      type="button"
      className={`${barBtn} ${on ? "bg-sunk text-ink" : ""}`}
      aria-label={label}
      aria-pressed={on}
      data-tip={label}
      onClick={() => {
        if (on) listen.getState().toggle();
        else listen.getState().start(ix.article, from());
      }}
    >
      {busy ? <Loader2 size={17} className="animate-spin" /> : on && playing ? <Pause size={16} strokeWidth={1.9} /> : <Headphones size={17} strokeWidth={1.8} />}
    </button>
  );
}

export function ListenBar() {
  const { ix } = useReader();
  const on = useListen((s) => s.on);
  const playing = useListen((s) => s.playing);
  const busy = useListen((s) => s.busy);
  const error = useListen((s) => s.error);
  const at = useListen((s) => s.at);
  const total = useListen((s) => s.total);
  const block = useListen((s) => s.block);
  const speed = useListen((s) => s.speed);

  // Leaving the text stops the voice.
  useEffect(() => () => listen.getState().stop(), []);

  if (!on) return null;
  const n = block ? ix.numbers.get(block) : undefined;
  const pct = total > 0 ? Math.min(1, (at + (playing ? 0.5 : 0)) / total) : 0;

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative z-40 mx-auto mb-2 flex w-[calc(100%-24px)] max-w-[520px] items-center gap-1.5 overflow-hidden rounded-full border border-rule bg-raised px-2 py-1.5 shadow-pop"
      style={{ animation: "sheet-in 0.32s var(--ease-out)" }}
    >
      <span aria-hidden className="ml-1.5 hidden shrink-0 text-[var(--rubric)] sm:block">
        <Headphones size={15} strokeWidth={1.9} />
      </span>

      <span className="ml-1 min-w-0 flex-1 truncate pl-0.5 text-[12.5px] leading-none text-ink-2 sm:ml-0">
        {error ? (
          <span className="text-rubric-text">{error}</span>
        ) : busy ? (
          <span className="inline-flex items-center gap-1.5 text-ink-3">
            <Loader2 size={12} className="animate-spin" /> {busy}
          </span>
        ) : (
          <>
            <span className="font-medium text-ink">Listening</span>
            {n !== undefined && <span className="text-ink-3"> · ¶{n}</span>}
            <span className="tabular-nums text-ink-4">{` · ${Math.min(at + 1, total)}/${total}`}</span>
          </>
        )}
      </span>

      <button type="button" onClick={() => listen.getState().cycleSpeed()} aria-label={`Speed ${speed}×`} data-tip="Reading speed" className="h-8 rounded-full px-2 text-[12px] font-medium tabular-nums text-ink-3 transition-colors hover:bg-sunk hover:text-ink">
        {speed}×
      </button>
      <button type="button" onClick={() => listen.getState().step(-1)} aria-label="Previous paragraph" data-tip="Previous paragraph" className="grid size-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-sunk hover:text-ink">
        <ChevronLeft size={17} />
      </button>
      <button
        type="button"
        onClick={() => listen.getState().toggle()}
        aria-label={playing ? "Pause" : "Play"}
        data-tip={playing ? "Pause" : "Play"}
        className="grid size-9 place-items-center rounded-full bg-ink text-bg transition-transform active:scale-95"
      >
        {playing ? <Pause size={15} strokeWidth={2} /> : <Play size={15} strokeWidth={2} />}
      </button>
      <button type="button" onClick={() => listen.getState().step(1)} aria-label="Next paragraph" data-tip="Next paragraph" className="grid size-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-sunk hover:text-ink">
        <ChevronRight size={17} />
      </button>
      <button type="button" onClick={() => listen.getState().stop()} aria-label="Stop listening" data-tip="Stop" className="grid size-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-sunk hover:text-ink">
        <X size={16} />
      </button>

      <span aria-hidden className="pointer-events-none absolute inset-x-3 bottom-0 h-[2px] overflow-hidden rounded-full">
        <span className="block h-full rounded-full bg-[var(--rubric)] transition-[width] duration-300" style={{ width: `${pct * 100}%` }} />
      </span>
    </div>
  );
}
