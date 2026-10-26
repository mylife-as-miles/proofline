"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { ARTICLE_QUESTIONS } from "@/lib/actions";
import { startGloss } from "@/lib/ask";
import { useReader } from "./context";
import { WebSwitch } from "./WebSwitch";

export type ComposerHandle = { focus: () => void };

/**
 * Ask about the whole text. The answer is written in the margin beside the
 * paragraph you were reading when you asked, so it stays where your head was.
 *
 * The dock occupies the final auto-sized row of the reader grid. The middle
 * row is a clipped scroll region, so text can never paint underneath this band.
 * Suggestions grow the row naturally without size observers or global styles.
 */
export const Composer = forwardRef<ComposerHandle, { currentBlock: () => string | null; suggestions?: string[] }>(function Composer(
  { currentBlock, suggestions = ARTICLE_QUESTIONS },
  ref
) {
  const { ix } = useReader();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => ({ focus: () => setOpen(true) }), []);

  // Opened with the keyboard, the field takes the cursor as soon as it is drawn.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Clicking anywhere else folds it back down; what was typed is kept.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open]);

  // Grid layout owns this band's height; no observer writes dimensions back into itself.

  const ask = (question: string) => {
    const text = question.trim();
    if (!text) return;
    startGloss(ix, { at: currentBlock() ?? undefined, action: "ask", question: text });
    setQ("");
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={boxRef} className="composer relative z-30 pointer-events-none">
      <div className="relative bg-bg pb-[max(10px,env(safe-area-inset-bottom))] pt-1.5">
        <div className="mx-auto w-full max-w-[46rem] px-3 sm:px-6">
          {!open ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label={q ? `Ask about the whole text: ${q}` : "Ask anything about the whole text"}
                className="pointer-events-auto inline-flex h-9 max-w-full items-center gap-2 rounded-full border border-rule bg-raised pl-3.5 pr-2 text-[13px] font-medium text-ink-2 shadow-card transition-[border-color,color,transform] hover:border-rule-strong hover:text-ink active:scale-[0.98]"
              >
                <span className="truncate">{q || "Ask about the whole text"}</span>
                <kbd>/</kbd>
              </button>
            </div>
          ) : (
            <>
              {!q.trim() && (
                <div
                  className="pointer-events-auto mx-auto mb-2 w-fit max-w-full rounded-[16px] border border-rule bg-raised px-2.5 py-2 shadow-card"
                  style={{ animation: "rise 0.3s var(--ease-out) both" }}
                >
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => ask(s)}
                        className="rounded-full border border-rule bg-bg px-3 py-1.5 text-[12.5px] text-ink-2 transition-colors hover:border-rule-strong hover:text-ink"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  ask(q);
                }}
                className={`pointer-events-auto mx-auto flex max-w-[34rem] items-center gap-2 rounded-[16px] border bg-raised py-1.5 pl-4 pr-1.5 shadow-pop transition-[border-color,max-width] duration-300 ease-[var(--ease-out)] ${
                  focused ? "max-w-[38rem] border-rule-strong" : "border-rule"
                }`}
              >
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      setOpen(false);
                    }
                  }}
                  placeholder="Ask about the whole text"
                  aria-label="Ask anything about the whole text"
                  className="h-9 min-w-0 flex-1 bg-transparent text-[14.5px] text-ink outline-none focus-visible:outline-none placeholder:text-ink-3"
                />
                {!focused && !q && <kbd className="hidden sm:inline">/</kbd>}
                <WebSwitch />
                <button
                  type="submit"
                  disabled={!q.trim()}
                  aria-label="Ask"
                  data-tip="Ask"
                  data-tip-kbd={"\u21b5"}
                  className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-ink text-bg transition-opacity disabled:opacity-25"
                >
                  <ArrowUp size={17} strokeWidth={2.3} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
