"use client";

import { useSyncExternalStore } from "react";

/**
 * The desk at the foot of the shelf: the colour each note was given, the order
 * the notes were arranged in, and which notes are piled on one another.
 * Kept on this device, apart from the texts.
 */
export type NoteBoard = { colors: Record<string, string>; order: string[]; stacks: string[][] };

const KEY = "gloss:notes";
const DEFAULTS: NoteBoard = { colors: {}, order: [], stacks: [] };
const listeners = new Set<() => void>();
let cache: NoteBoard | null = null;

/** A pile needs at least two papers: anything less is just a note. */
const tidy = (stacks: string[][]) =>
  stacks
    .map((s) => [...new Set(s)].filter((id) => typeof id === "string" && id))
    .filter((s) => s.length > 1);

function read(): NoteBoard {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    cache = {
      colors: raw.colors ?? {},
      order: Array.isArray(raw.order) ? raw.order : [],
      stacks: Array.isArray(raw.stacks) ? tidy(raw.stacks.filter(Array.isArray)) : [],
    };
  } catch {
    cache = DEFAULTS;
  }
  return cache!;
}

function write(next: NoteBoard) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}

/** Give a note a colour. An empty colour puts it back on its default paper. */
export function setNoteColor(id: string, color: string) {
  const board = read();
  const next = { ...board.colors };
  if (color) next[id] = color;
  else delete next[id];
  write({ ...board, colors: next });
}

/** Keep the arrangement of the desk, front to back. */
export function setNoteOrder(order: string[]) {
  write({ ...read(), order });
}

/** Pile notes together. In each pile the first id is the paper on top. */
export function setNoteStacks(stacks: string[][]) {
  write({ ...read(), stacks: tidy(stacks) });
}

export function useNoteBoard(): NoteBoard {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => DEFAULTS
  );
}
