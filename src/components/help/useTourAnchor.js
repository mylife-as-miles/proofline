import { useEffect, useRef, useState } from 'react';
import { TOUR_STEPS } from '@/components/help/tourSteps';

export default function useTourAnchor(step, open, pathname) {
  const target = useRef(null);
  const virtualRef = useRef({ getBoundingClientRect: () => target.current?.getBoundingClientRect() ?? new DOMRect(window.innerWidth / 2, 75, 1, 1) });
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (!open) return;
    let alive = true, frame = 0, last = null;
    const find = () => {
      if (!alive) return;
      const primary = document.querySelector(TOUR_STEPS[step].target);
      const next = primary ?? document.querySelector('[data-block="c1"] .blk-text') ?? document.querySelector('h1');
      target.current = next;
      setMissing(!primary);
      if (next && next !== last) {
        last = next;
        next.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      }
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(find); };
    find();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    return () => { alive = false; observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener('resize', schedule); target.current = null; };
  }, [step, open, pathname]);
  return { virtualRef, missing };
}
