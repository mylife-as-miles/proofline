import { useState, useSyncExternalStore } from 'react';
import { getStorageError, subscribeStorageError, openDb } from '@/lib/db';
import { useStore } from '@/lib/store';

export default function StorageRecovery() {
  const message = useSyncExternalStore(subscribeStorageError, getStorageError, () => null);
  const [busy, setBusy] = useState(false);
  if (!message) return null;
  const retry = async () => {
    setBusy(true);
    try { await openDb(); useStore.getState().hydrate(); }
    catch { /* The retained error remains visible; no reset or data deletion. */ }
    finally { setBusy(false); }
  };
  return <section role="alert" aria-label="Local library recovery" className="fixed inset-x-3 top-[calc(var(--topbar-h)+12px)] z-[110] mx-auto max-w-xl rounded-2xl border border-rule bg-raised p-5 text-ink shadow-pop">
    <h2 className="font-serif text-xl">Your library is retained</h2>
    <p className="mt-2 text-sm">{message}</p>
    <p className="mt-2 text-sm text-ink-3">Close other Proofline tabs, allow browser storage, check free device space, then retry. Keep this browser profile and do not clear site data. If it still fails, keep your existing browser data for recovery rather than resetting it.</p>
    <button onClick={retry} disabled={busy} className="mt-4 min-h-11 rounded-full bg-ink px-5 text-bg disabled:opacity-50">{busy ? 'Retrying…' : 'Retry opening library'}</button>
  </section>;
}
