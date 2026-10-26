"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, Loader2, Telescope, X } from "lucide-react";
import { Link } from "react-router-dom";
import { COVERAGE_BEFORE, coverageLine, investigate, packetMarkdown, type Investigation } from "@/lib/evidence";
import { uid, useStore } from "@/lib/store";
import { useReader } from "./context";
import { FindingList } from "./EvidenceList";

const primaryBtn =
  "inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-bg transition-transform active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100";
const quietBtn = "inline-flex h-9 items-center gap-1.5 rounded-full border border-rule px-3.5 text-[13px] font-medium text-ink-2 hover:border-rule-strong hover:text-ink";

/**
 * Investigate: one claim, weighed only against texts the reader already has.
 * The comparison runs once; every quotation comes back checked against the
 * stored words, and the packet it leaves behind is a notebook entry.
 */
export function Investigate() {
  const { ix } = useReader();
  const claim = useStore((s) => s.investigateClaim);
  const library = useStore((s) => s.library);
  const setUI = useStore((s) => s.setUI);
  const addGloss = useStore((s) => s.addGloss);

  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [step, setStep] = useState<"choose" | "running" | "done" | "error">("choose");
  const [result, setResult] = useState<Investigation | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [hinted, setHinted] = useState(false);
  const run = useRef(0);

  // One quiet line the first time a claim is opened for comparison.
  useEffect(() => {
    try {
      setHinted(!localStorage.getItem("gloss:investigate-hinted"));
    } catch {
      setHinted(true);
    }
  }, []);
  const dismissHint = () => {
    try {
      localStorage.setItem("gloss:investigate-hinted", "1");
    } catch {}
    setHinted(false);
  };

  const others = useMemo(() => library.filter((x) => x.id !== ix.article.id), [library, ix.article.id]);
  const claimN = claim ? ix.numbers.get(claim.start.b) : undefined;
  const chosen = others.filter((x) => picked[x.id]);

  // Each new claim starts clean, with every other text ticked.
  useEffect(() => {
    if (!claim) return;
    const next: Record<string, boolean> = {};
    for (const x of library) if (x.id !== ix.article.id) next[x.id] = true;
    setPicked(next);
    setStep("choose");
    setResult(null);
    setError("");
    setMissing([]);
    setSaved(false);
    run.current++;
  }, [claim, library, ix.article.id]);

  const close = () => setUI({ investigateClaim: null });

  useEffect(() => {
    if (!claim) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (step === "running") {
        run.current++;
        setStep("choose");
      } else close();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [claim, step]);

  if (!claim) return null;

  const compare = async () => {
    if (!chosen.length) return;
    const mine = ++run.current;
    setStep("running");
    setError("");
    setResult(null);
    try {
      const out = await investigate({
        claim: claim.quote,
        from: { title: ix.article.title, blockId: claim.start.b, n: claimN },
        docs: chosen.map((x) => ({ id: x.id, title: x.title })),
      });
      if (mine !== run.current) return;
      setResult(out);
      setMissing(out.missing);
      setStep("done");
    } catch (e) {
      if (mine !== run.current) return;
      setError(e instanceof Error ? e.message : "The comparison could not be made.");
      setStep("error");
    }
  };

  const cancel = () => {
    run.current++;
    setStep("choose");
  };

  const keep = () => {
    if (!result) return;
    const ev = result.evidence;
    addGloss({
      id: uid(),
      articleId: ix.article.id,
      anchor: claim,
      action: "investigate",
      turns: [{ role: "assistant", content: ev.conclusion || "Compared with the texts you chose.", model: ev.model }],
      evidence: ev,
      note: packetMarkdown(ev),
      createdAt: Date.now(),
    });
    setSaved(true);
  };

  const counts = result
    ? {
        supports: result.evidence.findings.filter((f) => f.verdict === "supports").length,
        conflicts: result.evidence.findings.filter((f) => f.verdict === "conflicts").length,
        insufficient: result.evidence.findings.filter((f) => f.verdict === "insufficient").length,
      }
    : null;

  return (
    <div
      className="fixed inset-0 z-[78] grid place-items-center bg-ink/20 p-2 backdrop-blur-[2px] sm:p-6"
      style={{ animation: "fade 0.2s" }}
      onClick={close}
    >
      <div
        role="dialog"
        aria-label="Investigate this claim"
        className="pop flex max-h-[min(92dvh,780px)] w-full max-w-[640px] flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-rule px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-serif text-[19px] leading-none text-ink">
              <Telescope size={16} strokeWidth={1.8} className="text-rubric-text" aria-hidden /> Investigate
            </h2>
            <p className="mt-1.5 text-[12px] leading-snug text-ink-3">Weigh this claim against texts you already have.</p>
          </div>
          <button type="button" aria-label="Close" onClick={close} className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-sunk">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <blockquote className="border-l-2 border-[var(--rubric-line)] pl-3 font-serif text-[15.5px] leading-[1.5] text-ink">
            “{claim.quote.replace(/\s+/g, " ")}”
            <span className="mt-1 block text-[11.5px] not-italic text-ink-3">
              {ix.article.title}
              {claimN ? `, ¶${claimN}` : ""}
            </span>
          </blockquote>

          {step === "choose" && hinted && (
            <div className="mt-3 flex items-start gap-2 rounded-[10px] border border-rule bg-sunk px-3 py-2 text-[12px] leading-snug text-ink-3">
              <span className="min-w-0 flex-1">Tick the texts to weigh this claim against, then run. Only the excerpts listed below are sent, and every quotation comes back checked against the stored words.</span>
              <button type="button" aria-label="Dismiss tip" onClick={dismissHint} className="shrink-0 text-ink-4 hover:text-ink">
                <X size={13} />
              </button>
            </div>
          )}

          {step === "choose" && (
            <div className="mt-4">
              {others.length === 0 ? (
                <p className="text-[13.5px] leading-relaxed text-ink-2">
                  There are no other texts to compare this with yet.{" "}
                  <Link to="/library" className="font-medium text-rubric-text underline decoration-rule underline-offset-2" onClick={close}>
                    Add one to your library
                  </Link>{" "}
                  and come back.
                </p>
              ) : (
                <>
                  <p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-ink-4">Compare with</p>
                  <ul className="space-y-1">
                    {others.map((x) => (
                      <li key={x.id}>
                        <label className="flex cursor-pointer items-start gap-2.5 rounded-[10px] px-2 py-2 hover:bg-sunk">
                          <input
                            type="checkbox"
                            checked={!!picked[x.id]}
                            onChange={(e) => setPicked((p) => ({ ...p, [x.id]: e.target.checked }))}
                            className="mt-[3px] size-4 shrink-0 accent-[var(--rubric)]"
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-serif text-[14.5px] leading-snug text-ink">{x.title}</span>
                            {x.author && <span className="block truncate text-[11.5px] text-ink-3">{x.author}</span>}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  {/* The real reach of a comparison, said before it runs rather than after. */}
                  <p className="mt-3 rounded-[10px] border border-rule bg-sunk px-3 py-2.5 text-[12px] leading-snug text-ink-3">{COVERAGE_BEFORE}</p>
                </>
              )}
            </div>
          )}

          {step === "running" && (
            <div className="mt-5 flex items-start gap-2.5 text-[13.5px] leading-snug text-ink-2" role="status">
              <Loader2 size={16} className="mt-[1px] shrink-0 animate-spin text-rubric-text" aria-hidden />
              <span>
                Reading {chosen.length === 1 ? "one text" : `${chosen.length} texts`} and checking every quotation against the stored words…
              </span>
            </div>
          )}

          {step === "error" && (
            <div className="mt-4 flex items-start gap-2.5 rounded-[10px] border border-rule bg-sunk px-3 py-2.5 text-[13px] leading-snug text-ink-2" role="alert">
              <AlertCircle size={16} className="mt-[1px] shrink-0 text-rubric-text" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          {step === "done" && result && (
            <div className="mt-4">
              <p className="text-[11px] uppercase tracking-[0.08em] text-ink-4">Document evidence</p>
              <p className="mt-1 text-[12.5px] leading-snug text-ink-3">
                {counts!.supports} supporting · {counts!.conflicts} conflicting · {counts!.insufficient} not established, from{" "}
                {result.evidence.compared.length} text{result.evidence.compared.length === 1 ? "" : "s"}.
              </p>
              <p className="mt-1 text-[12px] leading-snug text-ink-4">{coverageLine(result.evidence)}</p>
              <div className="mt-3">
                <FindingList findings={result.evidence.findings} />
              </div>

              {result.evidence.conclusion && (
                <div className="mt-3 rounded-[12px] border border-rule bg-sunk px-3.5 py-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-ink-4">AI inference</p>
                  <p className="mt-1.5 font-serif text-[14.5px] leading-[1.5] text-ink">{result.evidence.conclusion}</p>
                </div>
              )}

              {result.evidence.dropped > 0 && (
                <p className="mt-3 text-[12px] leading-snug text-ink-3">
                  {result.evidence.dropped} quotation{result.evidence.dropped === 1 ? "" : "s"} could not be found in the stored text and{" "}
                  {result.evidence.dropped === 1 ? "was" : "were"} left out.
                </p>
              )}
              {missing.length > 0 && (
                <p className="mt-2 text-[12px] leading-snug text-ink-3">Could not be read: {missing.join(", ")}.</p>
              )}

              <p className="mt-3 text-[12px] leading-[1.5] text-ink-3">
                This says what evidence these excerpts hold — not that the claim is true in general. Relevant evidence may sit outside the excerpts read. Web
                evidence was not used in this comparison.
              </p>
              {saved && (
                <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-good">
                  <Check size={14} /> Kept in your notebook as an evidence packet.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule px-4 py-3 sm:px-5">
          <p className="min-w-0 text-[11.5px] leading-snug text-ink-4">Your documents' excerpts only · no web search</p>
          <div className="flex items-center gap-2">
            {step === "choose" && others.length > 0 && (
              <button type="button" className={primaryBtn} onClick={compare} disabled={!chosen.length}>
                Compare {chosen.length > 0 ? `(${chosen.length})` : ""}
              </button>
            )}
            {step === "running" && (
              <button type="button" className={quietBtn} onClick={cancel}>
                Cancel
              </button>
            )}
            {step === "error" && (
              <>
                <button type="button" className={quietBtn} onClick={close}>
                  Close
                </button>
                <button type="button" className={primaryBtn} onClick={compare}>
                  Try again
                </button>
              </>
            )}
            {step === "done" && (
              <>
                <button type="button" className={quietBtn} onClick={close}>
                  Close
                </button>
                <button type="button" className={primaryBtn} onClick={keep} disabled={saved}>
                  {saved ? "Kept" : "Keep in notebook"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
