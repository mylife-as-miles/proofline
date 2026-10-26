"use client";

import { useState } from "react";
import { Check, Download, Trash2, X } from "lucide-react";

const act =
  "inline-flex h-7 items-center gap-1 rounded-full border border-rule bg-raised px-2.5 text-[12px] font-medium leading-none text-ink-3 transition-colors hover:border-rule-strong hover:text-ink disabled:pointer-events-none disabled:opacity-40";

/** The row that appears while entries are picked: how many, and what to do with them. */
export function NotebookBulkBar({ count, allPicked, onAll, onExport, onDelete, onDone }) {
  const [sure, setSure] = useState(false);

  if (sure) {
    return (
      <div role="group" aria-label="Confirm delete" className="mt-3 flex items-center gap-1.5 rounded-[10px] border border-rule bg-sunk px-2 py-1.5">
        <span className="ml-1 min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink-2">
          Delete {count} {count === 1 ? "entry" : "entries"}?
        </span>
        <button
          type="button"
          onClick={() => {
            setSure(false);
            onDelete();
          }}
          className="inline-flex h-7 items-center rounded-full bg-rubric-wash px-2.5 text-[12px] font-medium leading-none text-rubric-text transition-opacity hover:opacity-80"
        >
          Delete
        </button>
        <button type="button" onClick={() => setSure(false)} className={act}>
          Keep
        </button>
      </div>
    );
  }

  return (
    <div role="group" aria-label="Picked entries" className="mt-3 flex items-center gap-1.5 rounded-[10px] border border-rule bg-sunk px-2 py-1.5">
      <span className="ml-1 min-w-0 flex-1 truncate text-[12.5px] font-medium tabular-nums text-ink-2">
        {count ? `${count} picked` : "Pick entries"}
      </span>
      <button type="button" onClick={onAll} aria-label={allPicked ? "Clear the selection" : "Pick everything shown"} className={act}>
        <Check size={13} strokeWidth={2.4} />
        {allPicked ? "None" : "All"}
      </button>
      <button type="button" onClick={onExport} disabled={!count} aria-label="Export the picked entries" className={act}>
        <Download size={13} />
        Export
      </button>
      <button type="button" onClick={() => setSure(true)} disabled={!count} aria-label="Delete the picked entries" className={act}>
        <Trash2 size={13} />
        Delete
      </button>
      <button type="button" onClick={onDone} aria-label="Done picking" className="grid size-7 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-raised hover:text-ink">
        <X size={15} />
      </button>
    </div>
  );
}
