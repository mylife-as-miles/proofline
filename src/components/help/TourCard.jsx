import { X } from 'lucide-react';
import { TOUR_STEPS } from '@/components/help/tourSteps';

const button = 'min-h-11 min-w-11 rounded-full border border-rule px-4 text-[13px] text-ink-2 hover:bg-sunk';
export default function TourCard({ step, missing, back, next, close, example, notebook }) {
  const item = TOUR_STEPS[step];
  return <div data-proofline-tour>
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1"><p className="text-[11px] uppercase tracking-widest text-rubric-text">Optional tour · {step + 1} of 5</p><h2 id="proofline-tour-title" className="mt-1 font-serif text-[23px] leading-tight text-ink">{item.title}</h2></div>
      <button type="button" data-tour-close aria-label="Close tour" onClick={() => close('closed')} className="grid min-h-11 min-w-11 place-items-center rounded-full text-ink-3 hover:bg-sunk"><X size={18} /></button>
    </div>
    <p id="proofline-tour-body" className="mt-3 text-[13px] leading-relaxed text-ink-2">{item.body}</p>
    {missing && <p role="status" className="mt-3 rounded-xl border border-rule bg-sunk p-3 text-[12px] text-ink-2">The selection control is not available yet. In the local example, drag-select the first paragraph to reveal its toolbar; on touch, long-press and extend the selection. Nothing has been skipped or run.</p>}
    {((missing && step > 0) || step === 0) && <button type="button" onClick={example} className={`${button} mt-3`}>Open local example</button>}
    {step === 4 && <button type="button" onClick={notebook} className={`${button} mt-3`}>Open Notebook</button>}
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => close('skipped')} className="mr-auto min-h-11 px-2 text-[13px] text-ink-3">Skip</button>
      <button type="button" disabled={step === 0} onClick={back} className={`${button} disabled:opacity-35`}>Back</button>
      <button type="button" onClick={next} className="min-h-11 min-w-11 rounded-full bg-ink px-5 text-[13px] text-bg">{step === 4 ? 'Done' : 'Next'}</button>
    </div>
  </div>;
}
