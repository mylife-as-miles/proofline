"use client";

import { useSyncExternalStore } from "react";
import type { Brief } from "./brief";

/**
 * Saved briefs live in this browser, like the rest of the notebook's local
 * state. A brief is a document the reader edits, so every change is written
 * back here as it is made.
 */

const KEY = "proof:briefs:v1";
const listeners = new Set<() => void>();
let cache: Brief[] | null = null;

function read(): Brief[] {
  if (cache) return cache;
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(data) ? (data as Brief[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: Brief[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // A full quota must not lose the brief on screen.
  }
  for (const l of listeners) l();
}

export const listBriefs = (): Brief[] => read();

export function saveBrief(b: Brief) {
  write([b, ...read().filter((x) => x.id !== b.id)]);
}

export function patchBrief(id: string, patch: Partial<Brief>) {
  write(read().map((b) => (b.id === id ? { ...b, ...patch } : b)));
}

export function removeBrief(id: string) {
  write(read().filter((b) => b.id !== id));
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useBriefs(): Brief[] {
  return useSyncExternalStore(subscribe, listBriefs, listBriefs);
}
