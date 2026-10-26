"use client";

import type { Article } from "./article";

/**
 * Device sync, on this platform. A reader's texts, glosses and highlights live
 * in this browser; there is no account to sync them through, so the shelf
 * watcher and the pull-from-account path are quiet no-ops.
 */

export function watchShelf(): () => void {
  return () => {};
}

export function startSync(_userId: string) {
  return () => {};
}

export async function fetchText(_id: string): Promise<Article | null> {
  return null;
}
