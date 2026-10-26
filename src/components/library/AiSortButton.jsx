import { useState } from 'react';
import { backfill } from '@/lib/shelving';
import { useStore } from '@/lib/store';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

export default function AiSortButton() {
  const library = useStore(s => s.library);
  const hydrated = useStore(s => s.hydrated);
  const count = library.filter(x => !x.topic && x.origin !== 'sample').length;
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  if (!hydrated || !count) return null;
  const sort = async () => {
    setBusy(true);
    try { await backfill(useStore.getState().library, 40); }
    finally { setBusy(false); setOpen(false); }
  };
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><button disabled={busy} className="min-h-11 rounded-full border border-rule px-3 text-[13px] text-ink-2">{busy ? 'Sorting…' : 'Optional AI sorting'}</button></PopoverTrigger>
    <PopoverContent collisionPadding={12} className="z-[90] max-w-[calc(100vw-24px)] border-rule bg-raised text-ink">
      <p className="font-serif text-lg">Sort with AI?</p>
      <p className="mt-2 text-sm text-ink-3">Sends metadata and excerpts from up to {Math.min(count, 40)} unsorted texts. Each text uses integration credits; the selected model may cost more than one credit. Manual topic changes remain available at no AI cost.</p>
      <button onClick={sort} disabled={busy} className="mt-3 min-h-11 rounded-full bg-ink px-4 text-bg">{busy ? 'Sorting…' : 'Confirm AI sorting'}</button>
    </PopoverContent>
  </Popover>;
}
