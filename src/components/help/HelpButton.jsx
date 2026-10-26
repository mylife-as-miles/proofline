import { useRef, useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export default function HelpButton({ compact = false }) {
  const [open, setOpen] = useState(false);
  const button = useRef(null);
  const launching = useRef(false);
  return <TooltipProvider delayDuration={350}><Popover open={open} onOpenChange={setOpen}>
    <Tooltip><TooltipTrigger asChild><PopoverTrigger asChild>
      <button ref={button} type="button" aria-label="Help" className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-full px-2 text-ink-3 hover:bg-sunk hover:text-ink">
        <CircleHelp size={17} aria-hidden />{!compact && <span className="hidden text-[13px] sm:inline">Help</span>}
      </button>
    </PopoverTrigger></TooltipTrigger><TooltipContent className="border border-rule bg-raised text-ink">Help and the optional five-step tour</TooltipContent></Tooltip>
    <PopoverContent align="end" collisionPadding={12} onCloseAutoFocus={e => { if (launching.current) { e.preventDefault(); launching.current = false; } }} className="z-[100] max-w-[calc(100vw-24px)] border-rule bg-raised text-ink motion-reduce:animate-none">
      <p className="font-serif text-xl">A little guidance</p>
      <p className="mt-2 text-sm text-ink-3">Five optional steps. The tour opens a bundled example, never runs AI, and can be replayed here.</p>
      <button type="button" className="mt-3 min-h-11 rounded-full bg-ink px-4 text-bg" onClick={() => { launching.current = true; setOpen(false); window.dispatchEvent(new CustomEvent('proofline:tour', { detail: { trigger: button.current } })); }}>Take a tour</button>
    </PopoverContent>
  </Popover></TooltipProvider>;
}
