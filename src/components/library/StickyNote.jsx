import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { tidyTitle } from "@/lib/article";

/** The papers a note can be written on, in the order the palette shows them. */
export const NOTE_COLORS = [
  { key: "butter", label: "Butter" },
  { key: "blush", label: "Blush" },
  { key: "sage", label: "Sage" },
  { key: "sky", label: "Sky" },
  { key: "sand", label: "Sand" },
  { key: "lilac", label: "Lilac" },
];

export const DEFAULT_COLORS = NOTE_COLORS.map((c) => c.key);

/** One paper on the desk. `dragProps` is left out when it can't be picked up. */
export default function StickyNote({ note, picking, picked, onColor, onToggle, dragProps }) {
  const { id, item, pct, color } = note;
  const title = tidyTitle(item.title);
  const [open, setOpen] = useState(false);
  return (
    <div className="note-frame" data-note-id={id} {...dragProps}>
      <Link
        to={`/read/${encodeURIComponent(id)}`}
        aria-label={`Resume ${title}`}
        className={picked ? "note is-picked" : "note"}
        data-color={color}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        onClick={(e) => {
          if (!picking) return;
          e.preventDefault();
          onToggle(id);
        }}
      >
        <span className="note-title font-serif">{title}</span>
        <span className="note-by">{item.author || item.source || "Saved document"}</span>
        <span className="note-foot">
          <span>{pct >= 100 ? "Read again" : "Resume"} · {pct}% read</span>
          <ArrowUpRight size={14} className="shrink-0" aria-hidden />
        </span>
      </Link>

      {dragProps ? <span className="note-grip" data-grip aria-hidden /> : null}

      {picking ? (
        <input type="checkbox" className="note-pick" checked={picked} onChange={() => onToggle(id)} aria-label={`Select ${title}`} />
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="note-color" data-color={color} aria-label={`Colour of ${title}`} />
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={8} className="note-palette">
            <p className="note-palette-label">Paper</p>
            <div className="note-swatches">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className="note-swatch"
                  data-color={c.key}
                  aria-label={c.label}
                  aria-pressed={c.key === color}
                  title={c.label}
                  onClick={() => {
                    onColor(id, c.key);
                    setOpen(false);
                  }}
                />
              ))}
            </div>
            <button type="button" className="note-palette-reset" onClick={() => {
              onColor(id, "");
              setOpen(false);
            }}>
              Back to plain paper
            </button>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
