"use client";

/**
 * Painted covers in the browser: kept in the app's Dexie database. There is
 * no picture model behind them in this build, so a text without a painted
 * cover falls back to its topic's own plate.
 */

import { db } from "./db";
import { useStore, type LibraryItem } from "./store";

const urls = new Map<string, string>();

/** A painted cover's picture, as an object URL, if this device made one. */
export async function paintedUrl(id: string): Promise<string | null> {
  const hit = urls.get(id);
  if (hit) return hit;
  let blob: Blob | undefined;
  try {
    blob = (await db.covers.get(id))?.blob;
  } catch {
    return null;
  }
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urls.set(id, url);
  return url;
}

export async function forgetCover(id: string): Promise<void> {
  const hit = urls.get(id);
  if (hit) {
    URL.revokeObjectURL(hit);
    urls.delete(id);
  }
  try {
    await db.covers.delete(id);
  } catch {}
}

export async function paint(_item: LibraryItem): Promise<"ok" | "rest" | "error"> {
  return "error";
}

export async function paintAll(_items: LibraryItem[]): Promise<void> {
  return;
}

export { useStore };
