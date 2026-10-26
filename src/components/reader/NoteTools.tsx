"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** One quiet action in an entry's row. */
export function Tool({ label, onClick, pressed, children }: { label: string; onClick: () => void; pressed?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      data-tip={label}
      onClick={onClick}
      className={`grid size-7 place-items-center rounded-full transition-colors hover:bg-sunk hover:text-ink focus-visible:bg-sunk focus-visible:text-ink ${
        pressed ? "text-rubric-text" : "text-ink-4"
      }`}
    >
      {children}
    </button>
  );
}

/** Your own words beside an entry: written here, kept on Save or ⌘↵. */
export function NoteBox({ value, placeholder, onSave, onClose }: { value?: string; placeholder: string; onSave: (v?: string) => void; onClose: () => void }) {
  const [text, setText] = useState(value ?? "");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  const save = () => onSave(text.trim() || undefined);

  return (
    <div className="mt-3">
      <textarea
        ref={ref}
        rows={2}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          const el = e.currentTarget;
          el.style.height = "auto";
          el.style.height = `${el.scrollHeight}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
        }}
        className="w-full resize-none rounded-[10px] border border-rule bg-raised px-3 py-2 text-[13.5px] leading-[1.55] text-ink outline-none transition-colors placeholder:text-ink-4 focus:border-rule-strong"
      />
      <div className="mt-1.5 flex items-center gap-1">
        <button type="button" onClick={save} className="h-7 rounded-full bg-ink px-3 text-[12px] font-medium text-bg transition-opacity hover:opacity-90">
          Save
        </button>
        <button type="button" onClick={onClose} className="h-7 rounded-full px-2.5 text-[12px] font-medium text-ink-3 transition-colors hover:bg-sunk hover:text-ink">
          Cancel
        </button>
        <span aria-hidden className="ml-auto pr-1 text-[11px] text-ink-4">
          ⌘↵
        </span>
      </div>
    </div>
  );
}
