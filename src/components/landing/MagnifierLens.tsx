"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * A reader's magnifier: wherever there is type on the page the pointer becomes a
 * lens, showing the words beneath it blown up. No cursor, no lens.
 */
export function MagnifierLens({
  zone,
  scale = 1.9,
  size = 142,
}: {
  zone: RefObject<HTMLElement>;
  scale?: number;
  size?: number;
}) {
  const lens = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const area = zone.current;
    if (!area) return;
    // A lens is only a cursor where there is one: on a touch-only screen the
    // finger would drag it around instead, so there it is left alone.
    const touchOnly = navigator.maxTouchPoints > 0 && !window.matchMedia("(any-hover: hover)").matches;
    if (touchOnly) return;
    area.classList.add("lens-live");

    const r = size / 2;
    let frame = 0;
    let held: Element | null = null;

    // No lens over bare paper: the pointer comes back as itself.
    const hide = () => {
      area.classList.remove("lens-on");
      if (lens.current) lens.current.style.opacity = "0";
    };

    // The word under the pointer — type, not bare paper. The caret alone is not
    // enough: it snaps to the nearest letter even out in the margin, so the
    // letter it landed on has to sit under the pointer too.
    const typeAt = (x: number, y: number) => {
      const pos = (document as unknown as {
        caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
      }).caretPositionFromPoint?.(x, y);
      const snapped = document.caretRangeFromPoint?.(x, y);
      const node: Node | null = pos?.offsetNode ?? snapped?.startContainer ?? null;
      if (!node || node.nodeType !== 3 || !node.textContent?.trim()) return null;

      // The caret snaps to a letter boundary, so both letters around it count.
      const off = Math.max(0, pos?.offset ?? snapped?.startOffset ?? 0);
      const range = document.createRange();
      range.setStart(node, Math.max(0, off - 1));
      range.setEnd(node, Math.min(off + 1, node.textContent.length));
      const glyph = range.getBoundingClientRect();
      if (!glyph.width && !glyph.height) return null;

      const near =
        x >= glyph.left - 6 &&
        x <= glyph.right + 6 &&
        y >= glyph.top - glyph.height * 0.6 &&
        y <= glyph.bottom + glyph.height * 0.6;
      return near ? node : null;
    };

    // The block holding it, raised until it is wider than the glass, so the lens
    // shows the words in their surroundings rather than a lone fragment.
    const blockOf = (node: Node) => {
      let el = (node.parentElement ?? area) as HTMLElement;
      while (el.parentElement && el !== area && (el.offsetWidth < size * 1.3 || el.offsetHeight < size * 0.7)) {
        el = el.parentElement;
      }
      return el;
    };

    const show = (x: number, y: number) => {
      const node = typeAt(x, y);
      if (!node) return hide();
      const el = blockOf(node);

      // Only the words change: the copy is rebuilt when the block changes, not
      // on every pixel of movement.
      if (held !== el && inner.current) {
        const copy = el.cloneNode(true) as HTMLElement;
        copy.removeAttribute("id");
        copy.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
        copy.style.position = "absolute";
        copy.style.margin = "0";
        copy.style.width = `${el.offsetWidth}px`;
        copy.style.textAlign = window.getComputedStyle(el).textAlign;
        inner.current.replaceChildren(copy);
        held = el;
      }

      const box = el.getBoundingClientRect();
      const px = x - box.left;
      const py = y - box.top;
      const copy = inner.current?.firstElementChild as HTMLElement | null;
      if (copy) {
        copy.style.left = `${r - px}px`;
        copy.style.top = `${r - py}px`;
        copy.style.transformOrigin = `${px}px ${py}px`;
        copy.style.transform = `scale(${scale})`;
      }
      area.classList.add("lens-on");
      if (lens.current) {
        lens.current.style.opacity = "1";
        lens.current.style.transform = `translate3d(${x - r}px, ${y - r}px, 0)`;
      }
    };

    const track = (e: PointerEvent) => {
      // Over a field the pointer is a caret: the lens steps aside.
      if ((e.target as Element | null)?.closest?.("input, textarea, select, [contenteditable]")) {
        held = null;
        return hide();
      }
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        show(e.clientX, e.clientY);
      });
    };

    // The lens lives only over the zone: anywhere else on the page the pointer
    // is itself again, however it got there.
    const away = (e: PointerEvent) => {
      if (!area.contains(e.target as Node)) {
        held = null;
        hide();
      }
    };

    area.addEventListener("pointermove", track);
    area.addEventListener("pointerleave", hide);
    document.addEventListener("pointermove", away);
    return () => {
      area.classList.remove("lens-live");
      area.removeEventListener("pointermove", track);
      area.removeEventListener("pointerleave", hide);
      document.removeEventListener("pointermove", away);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [zone, scale, size]);

  return (
    <div ref={lens} aria-hidden className="hero-lens" style={{ width: size, height: size, opacity: 0 }}>
      <div className="hero-lens-glass">
        <div ref={inner} className="hero-lens-in" style={{ width: size, height: size }} />
      </div>
    </div>
  );
}
