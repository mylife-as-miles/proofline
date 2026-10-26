"use client";

import { Star, X } from "lucide-react";

const chip = (on: boolean) =>
  `inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[11.5px] font-medium leading-none transition-colors ${
    on ? "border-rule-strong bg-sunk text-ink" : "border-rule text-ink-3 hover:text-ink"
  }`;

/** The notebook's filter row: starred entries, then every tag in the notebook with its count. */
export function NotebookFilters({
  tags,
  tag,
  starred,
  starredOnly,
  onTag,
  onStarred,
  onClear,
}: {
  tags: [string, number][];
  tag: string | null;
  starred: number;
  starredOnly: boolean;
  onTag: (t: string | null) => void;
  onStarred: () => void;
  onClear: () => void;
}) {
  return (
    <div role="group" aria-label="Filter notebook" className="mt-3 flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        aria-pressed={starredOnly}
        data-tip={starredOnly ? "Show every entry" : "Starred only"}
        onClick={onStarred}
        className={chip(starredOnly)}
      >
        <Star size={10} className={starredOnly ? "fill-current text-rubric-text" : ""} />
        Starred
        <span className="tabular-nums text-ink-4">{starred}</span>
      </button>

      {tags.map(([t, n]) => (
        <button
          key={t}
          type="button"
          aria-pressed={tag === t}
          data-tip={tag === t ? `Stop filtering by ${t}` : `Show only ${t}`}
          onClick={() => onTag(tag === t ? null : t)}
          className={chip(tag === t)}
        >
          {t}
          <span className="tabular-nums text-ink-4">{n}</span>
        </button>
      ))}

      {(starredOnly || tag) && (
        <button
          type="button"
          aria-label="Clear filters"
          onClick={onClear}
          className="inline-flex items-center gap-[3px] rounded-full px-1.5 py-[3px] text-[11px] font-medium leading-none text-ink-3 transition-colors hover:text-ink"
        >
          <X size={10} />
          Clear
        </button>
      )}
    </div>
  );
}
