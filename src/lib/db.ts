/**
 * The app's database: IndexedDB through Dexie. Texts, the original files they
 * came from, painted covers and the reader's own notes all live in one place,
 * in this browser. No server, no connection string, no key.
 */

import Dexie, { type Table } from "dexie";
import type { Article } from "./article";

export type DocRow = { id: string; article: Article };
export type BlobRow = { id: string; blob: Blob };
export type StateRow = { key: string; value: unknown };

class ProoflineDB extends Dexie {
  /** Every text on the shelf, whole. */
  docs!: Table<DocRow, string>;
  /** The original PDF of an imported text. */
  files!: Table<BlobRow, string>;
  /** Painted covers. */
  covers!: Table<BlobRow, string>;
  /** Small named values: the reader's notes, their settings. */
  state!: Table<StateRow, string>;

  constructor() {
    super("proofline");
    this.version(1).stores({ docs: "id", files: "id", covers: "id", state: "key" });
  }
}

export const db = new ProoflineDB();

let ready: Promise<void> | null = null;
let storageError: string | null = null;
const listeners = new Set<() => void>();
export const getStorageError = () => storageError;
export const subscribeStorageError = (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); };
export function reportStorageError() {
  storageError = "Your local library could not be opened. No saved data has been deleted or replaced.";
  ready = null;
  listeners.forEach((fn) => fn());
}

/** Opening failure is recoverable: retain the database, reject, and let the reader retry. */
export function openDb(): Promise<void> {
  if (!ready) {
    ready = db.open().then(() => {
      storageError = null;
      listeners.forEach((fn) => fn());
    }).catch((error) => {
      reportStorageError();
      throw error;
    });
  }
  return ready;
}

/** A saved value from the state table, or null when it has never been written. */
export async function readState<T>(key: string): Promise<T | null> {
  await openDb();
  const row = await db.state.get(key);
  return (row?.value as T) ?? null;
}

export async function writeState(key: string, value: unknown): Promise<void> {
  await openDb();
  await db.state.put({ key, value });
}
