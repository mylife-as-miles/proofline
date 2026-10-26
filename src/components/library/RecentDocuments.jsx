import { useLayoutEffect, useRef, useState } from "react";
import { History } from "lucide-react";
import { forgetCover } from "@/lib/covers";
import { hideSample } from "@/lib/library-prefs";
import { setNoteColor, setNoteOrder, setNoteStacks, useNoteBoard } from "@/lib/notes-board";
import { useStore } from "@/lib/store";
import StickyNote, { DEFAULT_COLORS } from "@/components/library/StickyNote";
import NoteStack from "@/components/library/NoteStack";
import "@/styles/recent.css";

export default function RecentDocuments() {
  const hydrated = useStore((s) => s.hydrated);
  const library = useStore((s) => s.library);
  const progress = useStore((s) => s.progress);
  const removeFromLibrary = useStore((s) => s.removeFromLibrary);
  const { colors, order, stacks } = useNoteBoard();
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState([]);
  const [dragging, setDragging] = useState(null);
  const [fanned, setFanned] = useState(() => new Set());
  const [gathering, setGathering] = useState(null);
  const boardRef = useRef(null);
  const dragRef = useRef(null);
  const dropFrom = useRef(null);
  const rectsRef = useRef(new Map());
  const holdClick = useRef(false);

  const recent = library.filter((item) => progress[item.id]?.at > 0)
    .sort((a, b) => progress[b.id].at - progress[a.id].at).slice(0, 5);
  const ids = recent.map((item) => item.id);
  // New reads land at the front of the desk; the rest keep the arrangement you gave them.
  const arranged = [...ids.filter((id) => !order.includes(id)), ...order.filter((id) => ids.includes(id))];

  const cardOf = new Map(
    arranged.map((id) => [
      id,
      {
        id,
        item: recent.find((x) => x.id === id),
        pct: Math.round(Math.max(0, Math.min(1, progress[id].pct)) * 100),
        color: colors[id] || DEFAULT_COLORS[ids.indexOf(id) % DEFAULT_COLORS.length],
      },
    ])
  );

  // What the desk shows, slot by slot: a pile sits where its first paper sits.
  const slots = [];
  {
    const inStack = new Map();
    stacks.forEach((s) => s.forEach((id) => inStack.set(id, s)));
    const placed = new Set();
    for (const id of arranged) {
      if (placed.has(id)) continue;
      const members = (inStack.get(id) ?? []).filter((x) => arranged.includes(x));
      const slot = members.length > 1 ? members : [id];
      slot.forEach((m) => placed.add(m));
      slots.push(slot);
    }
  }

  const inStack = (id) => stacks.some((s) => s.includes(id));

  const captureRects = () => {
    const map = new Map();
    boardRef.current?.querySelectorAll("[data-note-id]").forEach((el) => map.set(el.dataset.noteId, el.getBoundingClientRect()));
    rectsRef.current = map;
  };

  // A note pushed aside glides to its new place instead of jumping there.
  useLayoutEffect(() => {
    const before = rectsRef.current;
    if (!before.size && !dropFrom.current) return;
    rectsRef.current = new Map();
    boardRef.current?.querySelectorAll("[data-note-id]").forEach((el) => {
      const dropped = dropFrom.current?.id === el.dataset.noteId ? dropFrom.current.rect : null;
      const from = before.get(el.dataset.noteId) ?? dropped;
      if (!from) return;
      const to = el.getBoundingClientRect();
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      if (!dx && !dy) return;
      el.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0 0" }], { duration: 320, easing: "cubic-bezier(.22,.8,.28,1)" });
    });
    dropFrom.current = null;
  }, [arranged.join("|"), stacks.map((s) => s.join("+")).join("|")]);

  /** The note under the pointer, ignoring the one in the hand: dropping onto it piles the two up. */
  const noteAt = (x, y, held) => {
    const els = [...(boardRef.current?.querySelectorAll("[data-note-id]") ?? [])].reverse();
    for (const el of els) {
      if (el.dataset.noteId === held) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return el.dataset.noteId;
    }
    return null;
  };

  /** Where among the slots a note dropped on bare paper would land. */
  const slotGapAt = (x, y, held) => {
    const els = [...(boardRef.current?.querySelectorAll("[data-slot]") ?? [])];
    const rest = arranged.filter((id) => id !== held);
    let best = -1;
    let bestD = Infinity;
    let after = true;
    els.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const ox = Math.max(r.left - x, 0, x - r.right);
      const oy = Math.max(r.top - y, 0, y - r.bottom);
      const d = ox * ox + oy * oy;
      if (d < bestD) {
        bestD = d;
        best = i;
        after = x > r.left + r.width / 2;
      }
    });
    if (best < 0) return rest.length;
    const slot = slots[best];
    if (!slot) return rest.length;
    const anchor = after ? slot[slot.length - 1] : slot[0];
    const at = rest.indexOf(anchor);
    return at < 0 ? rest.length : at + (after ? 1 : 0);
  };

  /** Set a note down in the gap at `index`, lifting it off any pile first. */
  const placeAt = (id, index) => {
    const rest = arranged.filter((x) => x !== id);
    rest.splice(Math.max(0, Math.min(index, rest.length)), 0, id);
    if (inStack(id)) setNoteStacks(stacks.map((s) => s.filter((x) => x !== id)).filter((s) => s.length > 1));
    captureRects();
    setNoteOrder(rest);
  };

  /** Pile the note in hand on top of another. */
  const pileOnto = (id, targetId) => {
    const target = stacks.find((s) => s.includes(targetId));
    if (target?.includes(id)) return;
    const others = stacks.filter((s) => !s.includes(id) && s !== target);
    const rest = arranged.filter((x) => x !== id);
    const at = rest.indexOf(targetId);
    rest.splice(at < 0 ? rest.length : at, 0, id);
    setNoteOrder(rest);
    setNoteStacks([...others, target ? [id, ...target] : [id, targetId]]);
  };

  const onPointerDown = (e, id) => {
    if (picking || e.button !== 0) return;
    if (e.target.closest(".note-color, .note-pick")) return;
    const onGrip = !!e.target.closest("[data-grip]");
    if (e.pointerType === "touch" && !onGrip) return;
    const el = e.currentTarget.querySelector(".note");
    if (!el) return;
    dragRef.current = { id, index: slots.findIndex((s) => s.includes(id)), el, x0: e.clientX, y0: e.clientY, moved: false };
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < 7) return;
      d.moved = true;
      holdClick.current = true;
      d.el.style.transition = "none";
      d.el.style.zIndex = "6";
      d.el.classList.add("is-dragging");
      setDragging(d.id);
    }
    if (e.cancelable) e.preventDefault();
    d.el.style.translate = `${dx}px ${dy}px`;
    d.el.style.rotate = "1.6deg";
    d.el.style.scale = "1.02";
  };

  const endDrag = (e) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d?.moved) return;
    // Where the paper was let go of: it glides on from there instead of snapping back.
    const rect = d.el.getBoundingClientRect();
    d.el.style.translate = "";
    d.el.style.rotate = "";
    d.el.style.scale = "";
    d.el.style.zIndex = "";
    d.el.style.transition = "";
    d.el.classList.remove("is-dragging");
    setDragging(null);
    const on = noteAt(e.clientX, e.clientY, d.id);
    if (on) {
      dropFrom.current = { id: d.id, rect };
      pileOnto(d.id, on);
    } else placeAt(d.id, slotGapAt(e.clientX, e.clientY, d.id));
    window.setTimeout(() => {
      holdClick.current = false;
    }, 120);
  };

  // Fanned papers are squared back into a pile first, then the pile is drawn.
  const toggleFan = (key) => {
    if (!fanned.has(key)) {
      setFanned((f) => new Set(f).add(key));
      return;
    }
    setGathering(key);
    window.setTimeout(() => {
      setFanned((f) => {
        const next = new Set(f);
        next.delete(key);
        return next;
      });
      setGathering(null);
    }, 300);
  };

  const dragProps = (id) => ({
    onPointerDown: (e) => onPointerDown(e, id),
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  });

  const cancel = () => {
    setPicking(false);
    setPicked([]);
  };
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const removePicked = () => {
    for (const id of picked) {
      const item = recent.find((x) => x.id === id);
      if (item?.sample) {
        hideSample(id);
      } else {
        removeFromLibrary(id);
        void forgetCover(id);
      }
    }
    setNoteOrder(arranged.filter((id) => !picked.includes(id)));
    setNoteStacks(stacks.map((s) => s.filter((id) => !picked.includes(id))).filter((s) => s.length > 1));
    cancel();
  };

  return (
    <section aria-labelledby="recent-documents-heading" className={picking ? "notes is-picking" : "notes"}>
      <div className="notes-head">
        <History size={17} className="shrink-0 text-ink-3" aria-hidden />
        <h2 id="recent-documents-heading" className="font-serif text-[22px] leading-tight text-ink">Recent documents</h2>
        {picking ? (
          <div className="notes-actions">
            <span className="notes-count">{picked.length} selected</span>
            <button type="button" className="notes-remove" onClick={removePicked} disabled={!picked.length}>Remove</button>
            <button type="button" onClick={cancel}>Cancel</button>
          </div>
        ) : recent.length ? (
          <div className="notes-actions">
            <span className="notes-sub">Last five reads</span>
            <button type="button" onClick={() => setPicking(true)}>Select</button>
          </div>
        ) : (
          <span className="notes-actions">Last five reads</span>
        )}
      </div>
      {!hydrated ? <p role="status" className="text-[13px] text-ink-3">Loading recent documents…</p> : !recent.length ? (
        <p className="notes-empty">Documents you read will appear here, ready to resume.</p>
      ) : (
        <>
          {!picking && <p className="notes-hint">Drop a note onto another to pile them up, or into the gap to spread them out.</p>}
          <ol ref={boardRef} className={dragging ? "notes-list is-dragging" : "notes-list"}
            onClickCapture={(e) => {
              if (!holdClick.current) return;
              e.preventDefault();
              e.stopPropagation();
            }}>
            {slots.map((members) =>
              members.length > 1 ? (
                <NoteStack
                  key={members[0]}
                  cards={members.map((id) => cardOf.get(id))}
                  fanned={fanned.has(members[0])}
                  gathering={gathering === members[0]}
                  onToggleFan={toggleFan}
                  picking={picking}
                  picked={picked}
                  onColor={setNoteColor}
                  onToggle={toggle}
                  dragProps={dragProps}
                />
              ) : (
                <li key={members[0]} className="notes-cell" data-slot>
                  <StickyNote
                    note={cardOf.get(members[0])}
                    picking={picking}
                    picked={picked.includes(members[0])}
                    onColor={setNoteColor}
                    onToggle={toggle}
                    dragProps={picking ? undefined : dragProps(members[0])}
                  />
                </li>
              )
            )}
          </ol>
        </>
      )}
    </section>
  );
}
