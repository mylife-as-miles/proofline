"use client";

import { useState } from "react";
import { X } from "lucide-react";

/** The tags an entry carries, as quiet chips; each can be taken off. */
export function TagList({ tags, onRemove }: { tags?: string[]; onRemove?: (t: string) => void }) {
  if (!tags?.length) return null;
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-sunk px-2 py-[3px] text-[11.5px] font-medium leading-none text-ink-2">
          {t}
          {onRemove && (
            <button
              type="button"
              aria-label={`Remove tag ${t}`}
              onClick={() => onRemove(t)}
              className="text-ink-4 transition-colors hover:text-ink"
            >
              <X size={10} />
            </button>
          )}
        </span>
      ))}
    </div>
  );
}

/** One line to type a tag in: ↵ keeps it, commas file several at once. */
export function TagBox({ tags, onChange, onClose }: { tags?: string[]; onChange: (t?: string[]) => void; onClose: () => void }) {
  const [text, setText] = useState("");
  const keep = () => {
    const add = text
      .split(",")
      .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
      .filter(Boolean);
    if (!add.length) return;
    const next = Array.from(new Set([...(tags ?? []), ...add])).slice(0, 12);
    onChange(next.length ? next : undefined);
    setText("");
  };
  return (
    <input
      autoFocus
      value={text}
      aria-label="Add a tag"
      placeholder="A topic, ↵ to file it"
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          keep();
        }
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
      onBlur={() => {
        keep();
        onClose();
      }}
      className="mt-2.5 h-7 w-full rounded-full border border-rule bg-raised px-3 text-[12px] text-ink outline-none transition-colors placeholder:text-ink-4 focus:border-rule-strong"
    />
  );
}
