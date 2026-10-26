"use client";

import { base44 } from "@/api/base44Client";
import { MODELS, PLATFORM_MODEL } from "./models";
import type { Evidence, EvidenceFinding, Gloss, Highlight } from "./store";

/**
 * The brief: not a pile of saved highlights, but an argument assembled from
 * several texts. Two rules hold it together. Every assertion is tied back to
 * characters that exist in a stored text — a quotation that cannot be found is
 * thrown away, and an assertion left with no source is dropped and counted.
 * Disagreements are never averaged away: they are kept, unresolved, with both
 * sides linked. The reasoning is the reader's to edit afterwards.
 */

export type BriefSource = {
  articleId: string;
  articleTitle: string;
  blockId: string;
  start: number;
  end: number;
  quote: string;
  /**
   * The block the passage ends in, when it runs on past the paragraph it starts
   * in. Kept so a source across paragraphs still knows where it stops: without
   * it the ending address is lost and the link lands on the wrong characters.
   */
  endBlockId?: string;
  /** Paragraph number, when the checked evidence already knows it. */
  n?: number;
};

export type BriefAssertion = {
  id: string;
  text: string;
  /** Editable: the reader's own reasoning, prefilled by the assembly. */
  reasoning: string;
  sources: BriefSource[];
};

export type BriefSide = { label: string; quote: string; source: BriefSource };

export type BriefTension = {
  id: string;
  question: string;
  sides: BriefSide[];
  /** "evidence" tensions come from checked comparisons and are never dropped. */
  origin: "model" | "evidence";
};

export type Brief = {
  id: string;
  title: string;
  question: string;
  thesis: string;
  assertions: BriefAssertion[];
  tensions: BriefTension[];
  gaps: string[];
  texts: { id: string; title: string }[];
  /** Items offered that could not be used; assertions left without a source. */
  dropped: number;
  itemCount: number;
  model: string;
  createdAt: number;
};

/** One thing the reader marked, flattened out of the store so a brief can quote it. */
export type BriefItem = {
  key: string;
  kind: "highlight" | "question" | "evidence";
  articleId: string;
  articleTitle: string;
  quote: string;
  blockId: string;
  endBlockId?: string;
  start: number;
  end: number;
  note?: string;
  question?: string;
  evidence?: Evidence;
  starred: boolean;
};

const uid = () => Math.random().toString(36).slice(2, 10);

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^a-z0-9\u00c0-\u024f']+/g, " ")
    .trim();

/** A quotation, matched against the stored passage by its words, not its punctuation. */
function patternFor(quote: string) {
  // Every word counts, including one-letter ones: dropping "I" or "a" would
  // leave a gap the stored passage cannot bridge, and a true quote would be lost.
  const w = quote.match(/[A-Za-z0-9\u00c0-\u024f']+/g);
  if (!w || w.join("").length < 4) return null;
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(w.map(escape).join("[^A-Za-z0-9\u00c0-\u024f]+"), "i");
}

/** The whole marked passage, as a source. */
function itemSource(item: BriefItem): BriefSource {
  return {
    articleId: item.articleId,
    articleTitle: item.articleTitle,
    blockId: item.blockId,
    endBlockId: item.endBlockId ?? item.blockId,
    start: item.start,
    end: item.end,
    quote: item.quote,
  };
}

/**
 * Grounds a quotation in an item. The offsets are computed inside the stored
 * passage, so the jump lands on those words. An empty quote falls back to the
 * whole passage; anything not found returns null and is dropped.
 */
export function groundSource(item: BriefItem, quote: string): BriefSource | null {
  const q = (quote ?? "").trim();
  if (!q) return itemSource(item);
  const re = patternFor(q);
  if (!re) return null;
  const m = re.exec(item.quote);
  if (!m) return null;
  // A multi-block selection's offsets are local to two different blocks, not
  // offsets into its joined quote. Link to the whole verified marked context
  // rather than manufacture an invalid single-block address for a subquotation.
  if (item.endBlockId && item.endBlockId !== item.blockId) return itemSource(item);
  return { ...itemSource(item), start: item.start + m.index, end: item.start + m.index + m[0].length, quote: m[0] };
}

function sourceFromFinding(f: EvidenceFinding): BriefSource {
  return { articleId: f.docId, articleTitle: f.docTitle, blockId: f.blockId, start: f.start, end: f.end, quote: f.quote, n: f.n };
}

/** Everything the reader marked, across every text, in a shape the brief can use. */
export function collectItems(opts: {
  glosses: Record<string, Gloss[]>;
  highlights: Record<string, Highlight[]>;
  /** Every text whose title is known, so a source never reads "Another text" when it can be named. */
  titles: Record<string, string>;
}): BriefItem[] {
  const titles = new Map<string, string>(Object.entries(opts.titles));

  const out: BriefItem[] = [];
  for (const [articleId, list] of Object.entries(opts.glosses)) {
    for (const g of list) {
      if (!g.anchor) continue;
      out.push({
        key: g.id,
        kind: g.evidence ? "evidence" : "question",
        articleId,
        articleTitle: titles.get(articleId) ?? "Another text",
        quote: g.anchor.quote,
        blockId: g.anchor.start.b,
        endBlockId: g.anchor.end.b,
        start: g.anchor.start.o,
        end: g.anchor.end.o,
        note: g.note,
        question: g.question,
        evidence: g.evidence,
        starred: Boolean(g.starred),
      });
    }
  }
  for (const [articleId, list] of Object.entries(opts.highlights)) {
    for (const h of list) {
      out.push({
        key: h.id,
        kind: "highlight",
        articleId,
        articleTitle: titles.get(articleId) ?? "Another text",
        quote: h.anchor.quote,
        blockId: h.anchor.start.b,
        endBlockId: h.anchor.end.b,
        start: h.anchor.start.o,
        end: h.anchor.end.o,
        note: h.note,
        starred: Boolean(h.starred),
      });
    }
  }
  return out;
}

/**
 * A checked comparison already knows both sides of a disagreement. Those are
 * carried into the brief as they stand, whatever the assembly says.
 */
export function evidenceTensions(items: BriefItem[]): BriefTension[] {
  const out: BriefTension[] = [];
  for (const item of items) {
    const ev = item.evidence;
    if (!ev) continue;
    const conflicts = ev.findings.filter((f) => f.verdict === "conflicts");
    if (!conflicts.length) continue;
    const supports = ev.findings.filter((f) => f.verdict === "supports" && f.quote);
    out.push({
      id: uid(),
      question: `Does “${ev.claim.replace(/\s+/g, " ").slice(0, 140)}” hold as stated?`,
      origin: "evidence",
      sides: [
        { label: `As stated in ${ev.claimTitle}${ev.claimN ? ` ¶${ev.claimN}` : ""}`, quote: ev.claim, source: itemSource(item) },
        ...supports.slice(0, 1).map((f) => ({ label: f.docTitle, quote: f.quote, source: sourceFromFinding(f) })),
        ...conflicts.slice(0, 1).map((f) => ({ label: f.docTitle, quote: f.quote, source: sourceFromFinding(f) })),
      ],
    });
  }
  return out;
}

const SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    question: { type: "string" },
    thesis: { type: "string" },
    assertions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          reasoning: { type: "string" },
          support: {
            type: "array",
            items: {
              type: "object",
              properties: { item: { type: "integer" }, quote: { type: "string" } },
              required: ["item", "quote"],
            },
          },
        },
        required: ["text", "reasoning", "support"],
      },
    },
    tensions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          sides: {
            type: "array",
            items: {
              type: "object",
              properties: { item: { type: "integer" }, quote: { type: "string" } },
              required: ["item", "quote"],
            },
          },
        },
        required: ["question", "sides"],
      },
    },
    gaps: { type: "array", items: { type: "string" } },
  },
  required: ["title", "question", "thesis", "assertions", "tensions", "gaps"],
};

type Raw = {
  title: string;
  question: string;
  thesis: string;
  assertions: { text: string; reasoning: string; support: { item: number; quote: string }[] }[];
  tensions: { question: string; sides: { item: number; quote: string }[] }[];
  gaps: string[];
};

function buildPrompt(items: BriefItem[], focus: string) {
  const list = items
    .map((it, i) => {
      const marks = [it.starred ? "kept" : "", it.note ? `reader's note: ${it.note.replace(/\s+/g, " ").slice(0, 220)}` : "", it.question ? `reader asked: ${it.question.replace(/\s+/g, " ").slice(0, 180)}` : ""]
        .filter(Boolean)
        .join(" | ");
      return `ITEM ${i + 1} — ${it.articleTitle}\n"""${it.quote.replace(/\s+/g, " ").slice(0, 900)}"""${marks ? `\n(${marks})` : ""}`;
    })
    .join("\n\n");

  return `You are assembling one short evidence-backed brief for a reader, from passages they marked across several texts. You have no web access and no knowledge of these texts beyond the items below.

${focus ? `THE READER'S FOCUS: ${focus}\n\n` : ""}THE MATERIAL — only this may be used:

${list}

What to return:
- "title": at most 8 words. What this brief argues, not "A brief about…".
- "question": at most 20 words. The question these passages can actually answer together.
- "thesis": at most 45 words. A claim the items together can carry, worded so it could be argued against. Never a summary of the passages.
- "assertions": 3 to 6. Each is one load-bearing claim: "text" at most 30 words. "reasoning" at most 40 words on how the cited items get you there — inference, plainly marked as yours. "support": one to three entries, each {"item": the number above, "quote": words copied exactly from that item, at most 25 words, no ellipses}.
- Every assertion must cite at least one item. Quote only words that appear in that item. Never cite an item that does not support the assertion.
- "tensions": places where the items genuinely pull against each other. Each {"question": at most 18 words, "sides": two or three {"item": n, "quote": exact words}}. Never resolve a tension or pick a winner — the reader decides. If the items do not disagree, return an empty list.
- "gaps": one to three short statements of what these items cannot settle.
- Use no numbers that are not written in the items, no outside facts, no source that is not listed, and no probability or score.
- Do not write that a claim is true in general. Say what these passages support.

Return only the JSON object.`;
}

/**
 * Runs the assembly and keeps only what can be grounded. Throws a
 * reader-facing message when the model returns nothing usable.
 */
export async function assembleBrief(items: BriefItem[], focus = ""): Promise<Brief> {
  if (items.length < 2) throw new Error("Pick at least two passages — a brief needs more than one thing to weigh.");

  const raw = (await base44.integrations.Core.InvokeLLM({
    prompt: buildPrompt(items, focus),
    model: PLATFORM_MODEL,
    response_json_schema: SCHEMA,
  })) as Raw;

  if (!raw || !Array.isArray(raw.assertions)) throw new Error("The assembly came back empty. Try again.");

  let dropped = 0;
  const assertions: BriefAssertion[] = [];
  for (const a of raw.assertions) {
    const text = (a.text ?? "").trim();
    if (!text) continue;
    const sources: BriefSource[] = [];
    for (const s of a.support ?? []) {
      const item = items[Number(s.item) - 1];
      if (!item) {
        dropped++;
        continue;
      }
      const src = groundSource(item, s.quote ?? "");
      if (!src) {
        dropped++;
        continue;
      }
      if (!sources.some((x) => x.articleId === src.articleId && x.blockId === src.blockId && x.start === src.start)) sources.push(src);
    }
    // No verifiable source: the assertion does not go in the brief at all.
    if (!sources.length) {
      dropped++;
      continue;
    }
    assertions.push({ id: uid(), text, reasoning: (a.reasoning ?? "").trim(), sources });
  }

  const tensions: BriefTension[] = evidenceTensions(items);
  for (const t of raw.tensions ?? []) {
    const sides: BriefSide[] = [];
    for (const s of t.sides ?? []) {
      const item = items[Number(s.item) - 1];
      if (!item) continue;
      const src = groundSource(item, s.quote ?? "");
      if (!src) continue;
      sides.push({ label: item.articleTitle, quote: src.quote, source: src });
    }
    const distinct = new Set(sides.map((s) => s.source.articleTitle));
    if (sides.length >= 2 && distinct.size >= 2) {
      tensions.push({ id: uid(), question: (t.question ?? "").trim() || "Where these passages disagree", sides, origin: "model" });
    }
  }

  if (!assertions.length) {
    throw new Error("Nothing could be tied to a quotation from your passages, so no brief was kept. Try again, or mark a longer passage.");
  }

  const texts = [...new Map(items.map((i) => [i.articleId, i.articleTitle])).entries()].map(([id, title]) => ({ id, title }));
  return {
    id: uid(),
    title: (raw.title ?? "").trim() || "Untitled brief",
    question: (raw.question ?? "").trim(),
    thesis: (raw.thesis ?? "").trim(),
    assertions,
    tensions,
    gaps: (raw.gaps ?? []).map((g) => g.trim()).filter(Boolean).slice(0, 3),
    texts,
    dropped,
    itemCount: items.length,
    model: MODELS.flash.label,
    createdAt: Date.now(),
  };
}

export const sourceHref = (s: BriefSource) => `/read/${encodeURIComponent(s.articleId)}?at=${encodeURIComponent(s.blockId)}&s=${s.start}&e=${s.end}${s.endBlockId && s.endBlockId !== s.blockId ? `&eb=${encodeURIComponent(s.endBlockId)}` : ""}`;

const quote = (s: string) => `“${s.replace(/\s+/g, " ").trim()}”`;

/** The brief as a document: every assertion carries a link to the words it rests on. */
export function briefMarkdown(b: Brief): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const link = (s: BriefSource) => `[${s.articleTitle}${s.n ? ` ¶${s.n}` : ""}](${origin}${sourceHref(s)})`;
  const out: string[] = [`# ${b.title}`, ""];
  if (b.question) out.push(`**Question.** ${b.question}`, "");
  out.push(`**Thesis.** ${b.thesis}`, "");
  out.push("## Assertions", "");
  b.assertions.forEach((a, i) => {
    out.push(`${i + 1}. **${a.text}**`);
    if (a.reasoning) out.push(`   Reasoning: ${a.reasoning}`);
    for (const s of a.sources) out.push(`   - ${quote(s.quote)} — ${link(s)}`);
    out.push("");
  });
  if (b.tensions.length) {
    out.push("## Left unresolved", "");
    for (const t of b.tensions) {
      out.push(`**${t.question}**`);
      for (const s of t.sides) out.push(`- ${s.label}: ${quote(s.quote)} — ${link(s.source)}`);
      out.push("");
    }
  }
  if (b.gaps.length) {
    out.push("## What this cannot settle", "");
    for (const g of b.gaps) out.push(`- ${g}`);
    out.push("");
  }
  out.push(
    `---`,
    `Assembled from ${b.itemCount} passage${b.itemCount === 1 ? "" : "s"} across ${b.texts.length} text${b.texts.length === 1 ? "" : "s"}: ${b.texts
      .map((t) => t.title)
      .join("; ")}.`
  );
  out.push("Every assertion is quoted from those passages and linked to its place. Reasoning is inference, and is editable. Tensions are left open.");
  if (b.dropped) out.push(`${b.dropped} quotation${b.dropped === 1 ? "" : "s"} could not be found in the marked passages and ${b.dropped === 1 ? "was" : "were"} left out.`);
  return out.join("\n");
}

export const briefText = (b: Brief) => `${b.title}\n${b.thesis}`;
