"use client";

import { base44 } from "@/api/base44Client";
import { blockText, numberBlocks, type Article } from "./article";
import { PLATFORM_MODEL, MODELS } from "./models";
import { SAMPLES } from "./samples";
import { loadDoc, type Evidence, type EvidenceFinding } from "./store";

/**
 * Cross-document evidence: one claim from the text being read, weighed against
 * passages pulled from texts the reader already has. The model only ever sees
 * the passages below; every quotation it returns is then looked for, word for
 * word, in the stored text. A quote that cannot be found is thrown away, so
 * nothing on screen is invented.
 */

const STOP = new Set(
  "the and that this with from they have been were which their there about would could should into than then them these those when what where while whose your yours our ours its it's for are was not but all any can may might must does did doing done also more most some such only very much many other another over under between because after before through during when how why who whom".split(
    /\s+/
  )
);

const words = (s: string) => (s.toLowerCase().match(/[a-z0-9\u00c0-\u024f']{3,}/g) ?? []).filter((w) => !STOP.has(w));

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A passage is checked by its words, so straight or curly quotes and line breaks do not matter. */
const quotePattern = (quote: string) => {
  const w = quote.match(/[A-Za-z0-9\u00c0-\u024f']+/g) ?? [];
  if (w.length < 3) return null;
  return new RegExp(w.map(escape).join("[^A-Za-z0-9\u00c0-\u024f]+"), "i");
};

export type Passage = { blockId: string; n: number; text: string };

export type ComparedDoc = {
  id: string;
  title: string;
  passages: Passage[];
  /** How many paragraphs the text has, so the packet can say what share was read. */
  paragraphs: number;
};

export type Investigation = {
  evidence: Evidence;
  /** Texts the reader chose that could not be read. */
  missing: string[];
};

const PASSAGES_PER_DOC = 3;
const CHARS_PER_DOC = 1800;

/** The real reach of a comparison: a bounded sample of each text, never the whole thing. */
export const COVERAGE = { passages: PASSAGES_PER_DOC, chars: CHARS_PER_DOC };

const NUM = (n: number) => n.toLocaleString("en-GB");

/** Before a run, the limit the reader is agreeing to. */
export const COVERAGE_BEFORE = `Selected excerpts only: up to ${COVERAGE.passages} passages (about ${NUM(
  COVERAGE.chars
)} characters) are read from each text. Paragraphs outside those excerpts are not read, so relevant evidence can be missed.`;

/** After a run, what was read against what exists. */
export function coverageOf(e: { compared: { passages: number; paragraphs?: number }[] }) {
  const passages = e.compared.reduce((n, d) => n + d.passages, 0);
  const paragraphs = e.compared.reduce((n, d) => n + (d.paragraphs ?? d.passages), 0);
  return { passages, paragraphs, texts: e.compared.length };
}

/** One sentence the panel, the notebook and the export all carry, so the limit is never hidden. */
export function coverageLine(e: { compared: { passages: number; paragraphs?: number }[] }): string {
  const c = coverageOf(e);
  const texts = `${c.texts} text${c.texts === 1 ? "" : "s"}`;
  return `${c.passages} of ${c.paragraphs} paragraphs read across ${texts} — selected excerpts, not whole texts (up to ${COVERAGE.passages} passages, about ${NUM(
    COVERAGE.chars
  )} characters each). Relevant evidence may sit outside them.`;
}

/** The passages of a text that share the most vocabulary with the claim. */
export function passagesFor(article: Article, claim: string): Passage[] {
  const numbers = numberBlocks(article.blocks);
  const want = new Set(words(claim));
  const scored = article.blocks
    .filter((b) => numbers.has(b.id))
    .map((b) => {
      const text = blockText(b);
      const toks = words(text);
      const seen = new Set(toks);
      let hit = 0;
      for (const t of seen) if (want.has(t)) hit++;
      return { blockId: b.id, n: numbers.get(b.id)!, text, score: hit / Math.sqrt(Math.max(12, toks.length)) };
    })
    .filter((p) => p.text.trim().length > 0)
    .sort((a, b) => b.score - a.score);

  const picked: Passage[] = [];
  let used = 0;
  for (const p of scored) {
    if (picked.length >= PASSAGES_PER_DOC) break;
    if (used + p.text.length > CHARS_PER_DOC) continue;
    picked.push({ blockId: p.blockId, n: p.n, text: p.text });
    used += p.text.length;
  }
  // Nothing shares a word with the claim: the opening still lets the model say so from the text itself.
  if (!picked.length && scored.length) picked.push({ blockId: scored[0].blockId, n: scored[0].n, text: scored[0].text });
  return picked.sort((a, b) => a.n - b.n);
}

async function loadText(id: string): Promise<Article | null> {
  return SAMPLES.find((a) => a.id === id) ?? (await loadDoc(id));
}

/** Builds the reading list the model sees, one block of passages per chosen text. */
export async function gather(claim: string, docs: { id: string; title: string }[]) {
  const compared: ComparedDoc[] = [];
  const missing: string[] = [];
  for (const d of docs) {
    const article = await loadText(d.id);
    if (!article) {
      missing.push(d.title);
      continue;
    }
    const passages = passagesFor(article, claim);
    if (!passages.length) {
      missing.push(d.title);
      continue;
    }
    const numbers = numberBlocks(article.blocks);
    const paragraphs = article.blocks.filter((b) => numbers.has(b.id) && blockText(b).trim().length > 0).length;
    compared.push({ id: d.id, title: article.title || d.title, passages, paragraphs });
  }
  return { compared, missing };
}

const SCHEMA = {
  type: "object",
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          doc: { type: "integer" },
          quote: { type: "string" },
          verdict: { type: "string", enum: ["supports", "conflicts", "insufficient"] },
          why: { type: "string" },
        },
        required: ["doc", "quote", "verdict", "why"],
      },
    },
    conclusion: { type: "string" },
  },
  required: ["findings", "conclusion"],
};

type RawFinding = { doc: number; quote: string; verdict: EvidenceFinding["verdict"]; why: string };
type RawAnswer = { findings: RawFinding[]; conclusion: string };

function buildPrompt(claim: string, from: { title: string; n?: number }, docs: ComparedDoc[], missing: string[]) {
  const list = docs
    .map((d, i) => `— TEXT ${i + 1}: "${d.title}"\n${d.passages.map((p) => `[TEXT ${i + 1} | ¶${p.n}] ${p.text}`).join("\n")}`)
    .join("\n\n");
  const where = from.n ? ` (¶${from.n})` : "";
  return `You are checking one claim against a small set of texts a reader has chosen. You are not a search engine and you have no web access here.

THE CLAIM, quoted from "${from.title}"${where}:
"""${claim}"""

The passages below are the only material you may use. They come from these texts${missing.length ? ` (these could not be read and are not included: ${missing.join("; ")})` : ""}:

${list}

What to return:
- For each passage that genuinely bears on the claim, one finding: copy the exact words of that passage into "quote" — verbatim, at most 35 words, no ellipses, no paraphrase, no joining two sentences that are not adjacent. Set "verdict" to "supports" if the passage backs the claim within what it actually states, "conflicts" if it tells against it.
- A single trial, case or example never settles an always/never claim: keep the verdict to the scope the passage itself covers, and say in "why" what that scope is.
- For a text whose passages say nothing that bears on the claim, one finding with "verdict" "insufficient", "quote" empty, and "why" saying what that text does treat instead. "insufficient" means not established in the passages given — not that the whole text is silent.
- "doc" is the number of the text, as given above (1, 2, 3). Never invent a text or a title.
- "why" is your own reading of the claim and the passage together: at most 30 words, plain, no hedging beyond what is needed.
- Never give a probability, a score or a percentage. Never say the claim is universally true; say what these passages do or do not support.
- "conclusion": at most 45 words on what these texts, taken together, do and do not settle.

Return only the JSON object.`;
}

/** Finds a quotation in a text's stored words, and returns the exact characters it occupies. */
export function locate(article: Article, quote: string): { blockId: string; n: number; start: number; end: number; quote: string } | null {
  const re = quotePattern(quote);
  if (!re) return null;
  const numbers = numberBlocks(article.blocks);
  for (const b of article.blocks) {
    if (!numbers.has(b.id)) continue;
    const text = blockText(b);
    const m = re.exec(text);
    if (m && m.index >= 0) {
      return { blockId: b.id, n: numbers.get(b.id)!, start: m.index, end: m.index + m[0].length, quote: text.slice(m.index, m.index + m[0].length) };
    }
  }
  return null;
}

/**
 * Runs the comparison. Throws with a reader-facing message on a model or empty
 * answer; the panel turns that into a retry.
 */
export async function investigate(opts: {
  claim: string;
  from: { title: string; blockId?: string; n?: number };
  docs: { id: string; title: string }[];
}): Promise<Investigation> {
  const { compared, missing } = await gather(opts.claim, opts.docs);
  if (!compared.length) {
    throw new Error("None of the chosen texts could be read, so there is nothing to compare.");
  }

  const raw = (await base44.integrations.Core.InvokeLLM({
    prompt: buildPrompt(opts.claim, opts.from, compared, missing),
    model: PLATFORM_MODEL,
    response_json_schema: SCHEMA,
  })) as RawAnswer;

  if (!raw || !Array.isArray(raw.findings)) throw new Error("The comparison came back empty. Try again.");

  const findings: EvidenceFinding[] = [];
  let dropped = 0;
  for (const f of raw.findings) {
    const doc = compared[Number(f.doc) - 1];
    if (!doc) {
      dropped++;
      continue;
    }
    const verdict: EvidenceFinding["verdict"] = f.verdict === "supports" || f.verdict === "conflicts" ? f.verdict : "insufficient";
    const why = (f.why ?? "").trim();
    if (verdict === "insufficient") {
      findings.push({
        docId: doc.id,
        docTitle: doc.title,
        blockId: doc.passages[0].blockId,
        n: doc.passages[0].n,
        quote: "",
        start: 0,
        end: 0,
        verdict,
        why: why || "The reviewed excerpts from this text do not establish it either way.",
      });
      continue;
    }
    // The claim's own words are not a second source.
    const article = await loadText(doc.id);
    const at = article ? locate(article, f.quote ?? "") : null;
    if (!article || !at) {
      dropped++;
      continue;
    }
    findings.push({ docId: doc.id, docTitle: doc.title, blockId: at.blockId, n: at.n, quote: at.quote, start: at.start, end: at.end, verdict, why });
  }

  if (!findings.length) {
    throw new Error(
      dropped
        ? "The quotations offered could not be found in the stored texts, so none are shown. Try again."
        : "The comparison found nothing it could quote from these texts. Try other texts."
    );
  }

  const evidence: Evidence = {
    claim: opts.claim,
    claimTitle: opts.from.title,
    claimN: opts.from.n,
    compared: compared.map((d) => ({ id: d.id, title: d.title, passages: d.passages.length, paragraphs: d.paragraphs })),
    findings,
    conclusion: (raw.conclusion ?? "").trim(),
    model: MODELS.flash.label,
    at: Date.now(),
    dropped,
  };
  return { evidence, missing };
}

export const VERDICT_WORD: Record<EvidenceFinding["verdict"], string> = {
  supports: "Supporting evidence",
  conflicts: "Conflicts",
  insufficient: "Not established",
};

/** Never "the claim is true": what one passage shows, inside the scope it covers, and only in what was read. */
export const VERDICT_LINE: Record<EvidenceFinding["verdict"], string> = {
  supports: "Within stated scope",
  conflicts: "Tells against the claim",
  insufficient: "In reviewed excerpts",
};

/**
 * The packet as the reader keeps it in the notebook: claim, the checked
 * quotations with their places, the model's reading, and the limit of it.
 */
export function packetMarkdown(e: Evidence): string {
  const lines: string[] = [];
  lines.push(`CLAIM — “${e.claim.replace(/\s+/g, " ")}”`, `From ${e.claimTitle}${e.claimN ? `, ¶${e.claimN}` : ""}.`, "");
  lines.push("SOURCES COMPARED", ...e.compared.map((d) => `- ${d.title}`), "");
  lines.push("DOCUMENT EVIDENCE — quotations checked against the stored texts");
  let i = 0;
  for (const f of e.findings) {
    i++;
    lines.push(`${i}. ${f.docTitle} (¶${f.n}) — ${VERDICT_WORD[f.verdict]} · ${VERDICT_LINE[f.verdict]}`);
    if (f.quote) lines.push(`   “${f.quote.replace(/\s+/g, " ")}”`);
    if (f.why) lines.push(`   Reading: ${f.why}`);
  }
  if (e.dropped) lines.push(`(${e.dropped} quotation${e.dropped === 1 ? "" : "s"} could not be found in the stored text and ${e.dropped === 1 ? "was" : "were"} left out.)`);
  lines.push("");
  if (e.conclusion) lines.push("AI INFERENCE — a reading of the passages above, not a source", e.conclusion, "");
  lines.push(`COVERAGE — ${coverageLine(e)}`);
  lines.push(
    `Limited to the texts listed and the excerpts read from them. This says what evidence these excerpts hold, not that the claim is true in general. No web sources were used.`
  );
  return lines.join("\n");
}
