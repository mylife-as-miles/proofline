import { Layers } from "lucide-react";
import StickyNote from "./StickyNote";

/**
 * Notes piled on one another. Collapsed it is one paper with the rest showing
 * beneath it; fanned out it deals them apart, so every title can be read.
 */
export default function NoteStack({ cards, fanned, gathering, onToggleFan, picking, picked, onColor, onToggle, dragProps }) {
  const front = cards[0];
  return (
    <li className="notes-cell is-stack" data-slot data-stack={front.id}>
      {fanned ? (
        <div className={gathering ? "notes-fan is-gathering" : "notes-fan"}>
          {cards.map((c) => (
            <div className="note-fan-item" key={c.id}>
              <StickyNote
                note={c}
                picking={picking}
                picked={picked.includes(c.id)}
                onColor={onColor}
                onToggle={onToggle}
                dragProps={picking ? undefined : dragProps(c.id)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="note-pile" data-color={front.color}>
          <span className="note-pile-sheet is-under-2" aria-hidden />
          <span className="note-pile-sheet is-under" aria-hidden />
          <StickyNote note={front} picking={picking} picked={picked.includes(front.id)} onColor={onColor} onToggle={onToggle} />
        </div>
      )}
      <div className="stack-bar">
        <span className="stack-count">
          <Layers size={12} aria-hidden /> {cards.length} notes
        </span>
        <button type="button" className="stack-toggle" aria-expanded={fanned} onClick={() => onToggleFan(front.id)}>
          {fanned ? "Collapse" : "Fan out"}
        </button>
      </div>
    </li>
  );
}
