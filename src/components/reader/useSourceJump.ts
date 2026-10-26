import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { anchorToRange } from '@/lib/anchor';
import type { Anchor } from '@/lib/store';
import { readingStart, readingHeight, readingTop, scrollReadingTo } from '@/components/reader/readingScroll';

export default function useSourceJump(root: HTMLElement | null) {
  const location = useLocation();
  const request = useMemo(() => {
    const q = new URLSearchParams(location.search), at = q.get('at');
    return at ? { at, eb: q.get('eb') ?? at, s: Number(q.get('s') ?? NaN), e: Number(q.get('e') ?? NaN), key: location.key } : null;
  }, [location.search, location.key]);
  const wantsJump = useRef(Boolean(request));
  const [jumpMark, setJumpMark] = useState<Anchor | null>(null);
  const [jumpMiss, setJumpMiss] = useState(false);
  useEffect(() => {
    if (!request || !root) return;
    wantsJump.current = true;
    setJumpMiss(false); setJumpMark(null);
    const el = root.querySelector<HTMLElement>(`[data-block="${CSS.escape(request.at)}"]`);
    const end = root.querySelector<HTMLElement>(`[data-block="${CSS.escape(request.eb)}"]`);
    if (!el || !end) { setJumpMiss(true); return; }
    const length = el.querySelector('.blk-text')?.textContent?.length ?? 0;
    const endLength = end.querySelector('.blk-text')?.textContent?.length ?? 0;
    const ordered = el === end || Boolean(el.compareDocumentPosition(end) & Node.DOCUMENT_POSITION_FOLLOWING);
    const exact = ordered && Number.isInteger(request.s) && Number.isInteger(request.e) && request.s >= 0 && request.s < length && request.e > 0 && request.e <= endLength && (el !== end || request.e > request.s);
    const anchor = { start: { b: request.at, o: request.s }, end: { b: request.eb, o: request.e }, quote: '' };
    if (exact) setJumpMark(anchor);
    let active = true;
    const place = () => {
      if (!active || !el.isConnected) return;
      const rect = (exact ? anchorToRange(anchor)?.getBoundingClientRect() : null) ?? el.getBoundingClientRect();
      const lead = readingStart() + Math.max(20, (readingHeight() - rect.height) / 2);
      scrollReadingTo({ top: Math.max(0, readingTop() + rect.top - lead), behavior: 'instant' });
    };
    el.classList.add('is-flash');
    const frame = requestAnimationFrame(place);
    void document.fonts.ready.then(place);
    const timer = setTimeout(() => { active = false; el.classList.remove('is-flash'); }, 2000);
    return () => { active = false; cancelAnimationFrame(frame); clearTimeout(timer); el.classList.remove('is-flash'); };
  }, [request, root]);
  return { jumpMark, setJumpMark, jumpMiss, setJumpMiss, wantsJump };
}
