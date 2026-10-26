import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { useStore } from '@/lib/store';
import TourCard from '@/components/help/TourCard';
import useTourAnchor from '@/components/help/useTourAnchor';
import { EXAMPLE_PATH, TOUR_KEY } from '@/components/help/tourSteps';

export default function HelpTour() {
  const [open, setOpen] = useState(false), [step, setStep] = useState(0);
  const trigger = useRef(null), active = useRef(false);
  const navigate = useNavigate(), location = useLocation();
  const { virtualRef, missing } = useTourAnchor(step, open, location.pathname);
  const restore = () => queueMicrotask(() => (trigger.current?.isConnected ? trigger.current : document.querySelector('button[aria-label="Help"]'))?.focus({ preventScroll: true }));
  const close = useCallback((reason = 'closed') => {
    try { localStorage.setItem(TOUR_KEY, reason); } catch { /* Guidance still works without storage. */ }
    active.current = false; setOpen(false); restore();
  }, []);
  useEffect(() => {
    const start = e => { trigger.current = e.detail?.trigger ?? document.activeElement; active.current = true; setStep(0); setOpen(true); };
    window.addEventListener('proofline:tour', start);
    return () => { window.removeEventListener('proofline:tour', start); if (active.current) restore(); };
  }, []);
  useEffect(() => {
    if (!open) return;
    const key = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close('escaped'); } };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [open, close]);
  const example = () => { navigate(EXAMPLE_PATH); setStep(1); };
  const next = () => { if (step === 4) close('done'); else if (step === 0) example(); else setStep(s => s + 1); };
  return <Popover open={open} onOpenChange={value => { if (!value) close(); }}>
    <PopoverAnchor virtualRef={virtualRef} />
    <PopoverContent data-proofline-tour aria-labelledby="proofline-tour-title" aria-describedby="proofline-tour-body" side="bottom" align="center" avoidCollisions collisionPadding={12} sideOffset={10}
      onInteractOutside={e => e.preventDefault()} onCloseAutoFocus={e => e.preventDefault()}
      onOpenAutoFocus={e => { e.preventDefault(); queueMicrotask(() => document.querySelector('[data-tour-close]')?.focus()); }}
      className="z-[100] max-h-[calc(100dvh-24px)] w-[360px] max-w-[calc(100vw-24px)] overflow-y-auto rounded-2xl border-rule bg-raised text-ink shadow-pop motion-reduce:animate-none motion-reduce:transition-none">
      <TourCard step={step} missing={missing} back={() => setStep(s => Math.max(0, s - 1))} next={next} close={close} example={example} notebook={() => useStore.getState().setUI({ notebookOpen: true })} />
    </PopoverContent>
  </Popover>;
}
