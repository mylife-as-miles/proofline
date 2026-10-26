"use client";

import { base44 } from "@/api/base44Client";
import type { Action } from "./actions";
import type { BriefData } from "./article";
import { docPayload, type DocIndex } from "./doc";
import { uid, useStore, type Anchor, type Gloss, type Turn } from "./store";
import type { ModelKey, Source, Usage } from "./models";
import { MODELS, PLATFORM_MODEL, modelOf } from "./models";
import { BRIEF_TASK, buildMessages, firstTurn, systemFor, type LengthKey, type ThreadPayload } from "./prompts";

/**
 * The network side of the margin, on the platform's own model: the prompts are
 * built here exactly as before, sent whole, and the answer written back into
 * the gloss. There is no key to bring and nothing to stream from a server.
 */

const stops = new Set<string>();

export function stopGloss(id: string) {
  stops.add(id);
}

/** No key needed on this platform; kept so the key menu has something to read. */
export function readApiKey(): string {
  return "";
}

export function openKeyMenu() {
  window.dispatchEvent(new Event("gloss:key"));
}

export async function validateKey(_key: string): Promise<boolean> {
  return false;
}

type Chatish = { role: string; content: string | null };

/** The message list as one prompt: the system text first, then the thread in order. */
function flatten(messages: Chatish[]): string {
  return messages
    .filter((m) => m.content)
    .map((m) =>
      m.role === "system" ? (m.content as string) : m.role === "assistant" ? `MY EARLIER NOTE:\n${m.content}` : `THE READER:\n${m.content}`
    )
    .join("\n\n");
}

function lastAssistant(g: Gloss, fn: (t: Turn) => Turn): Gloss {
  const turns = g.turns.slice();
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i].role === "assistant") {
      turns[i] = fn(turns[i]);
      break;
    }
  }
  return { ...g, turns };
}

async function write(ix: DocIndex, glossId: string, modelKey: ModelKey) {
  const st = useStore.getState();
  const articleId = ix.article.id;
  const g = (st.glosses[articleId] ?? []).find((x) => x.id === glossId);
  if (!g) return;

  const history = g.turns
    .slice(1, -1)
    .filter((t) => !t.error && t.content)
    .map((t) => ({ role: t.role, content: t.content }));

  const from = g.anchor ? ix.numbers.get(g.anchor.start.b) : undefined;
  const to = g.anchor ? ix.numbers.get(g.anchor.end.b) : undefined;
  const at = g.at ? ix.numbers.get(g.at) : undefined;

  const thread: ThreadPayload = { action: g.action, quote: g.anchor?.quote, from, to, at, question: g.question };
  const doc = docPayload(ix, g.anchor?.start.b ?? g.at);
  const prompt = flatten(buildMessages(doc, thread, history, st.settings.length as LengthKey));

  const update = (fn: (t: Turn) => Turn) => useStore.getState().updateGloss(articleId, glossId, (x) => lastAssistant(x, fn));

  try {
    const out = await base44.integrations.Core.InvokeLLM({ prompt, model: PLATFORM_MODEL, add_context_from_internet: st.settings.search });
    const text = typeof out === "string" ? out.trim() : "";
    if (stops.has(glossId)) {
      update((t) => ({ ...t, streaming: false, error: t.content ? undefined : "Stopped." }));
      return;
    }
    if (!text) {
      update((t) => ({ ...t, streaming: false, error: "The note came back empty. Ask again." }));
      return;
    }
    update((t) => ({ ...t, content: text, streaming: false, model: MODELS[modelKey].label }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    update((t) => ({ ...t, streaming: false, error: `The note could not be written: ${message}` }));
  } finally {
    stops.delete(glossId);
    update((t) => ({ ...t, streaming: false, searching: false }));
  }
}

export function startGloss(
  ix: DocIndex,
  opts: { anchor?: Anchor; at?: string; action: Action; question?: string; modelKey?: ModelKey }
): string {
  const st = useStore.getState();
  const modelKey = modelOf(opts.modelKey ?? st.settings.model);
  // The answer is written in the margin, which focus mode hides: step out of it.
  if (st.focusMode) st.setUI({ focusMode: false });
  const g: Gloss = {
    id: uid(),
    articleId: ix.article.id,
    anchor: opts.anchor,
    at: opts.at,
    action: opts.action,
    question: opts.question,
    createdAt: Date.now(),
    turns: [{ role: "assistant", content: "", streaming: true, modelKey, model: MODELS[modelKey].label }],
  };
  st.addGloss(g);
  void write(ix, g.id, modelKey);
  return g.id;
}

export function followUp(ix: DocIndex, glossId: string, question: string, modelKey?: ModelKey) {
  const st = useStore.getState();
  const mk = modelOf(modelKey ?? st.settings.model);
  st.updateGloss(ix.article.id, glossId, (g) => ({
    ...g,
    turns: [
      ...g.turns,
      { role: "user", content: question },
      { role: "assistant", content: "", streaming: true, modelKey: mk, model: MODELS[mk].label },
    ],
  }));
  void write(ix, glossId, mk);
}

/** Re-runs the latest answer. */
export function retry(ix: DocIndex, glossId: string, modelKey?: ModelKey) {
  const st = useStore.getState();
  const mk = modelOf(modelKey ?? st.settings.model);
  st.updateGloss(ix.article.id, glossId, (g) =>
    lastAssistant(g, () => ({ role: "assistant", content: "", streaming: true, modelKey: mk, model: MODELS[mk].label }))
  );
  void write(ix, glossId, mk);
}

const BRIEF_SCHEMA = {
  type: "object",
  properties: {
    gist: { type: "string" },
    claims: {
      type: "array",
      items: {
        type: "object",
        properties: { text: { type: "string" }, cite: { type: "number" } },
        required: ["text", "cite"],
      },
    },
    caveats: {
      type: "array",
      items: {
        type: "object",
        properties: { text: { type: "string" }, cite: { type: "number" } },
        required: ["text", "cite"],
      },
    },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: { title: { type: "string" }, start: { type: "number" } },
        required: ["title", "start"],
      },
    },
  },
  required: ["gist", "claims", "sections"],
};

export async function fetchBrief(ix: DocIndex) {
  const st = useStore.getState();
  const id = ix.article.id;
  const modelKey = modelOf(st.settings.model);
  st.setBrief(id, { status: "loading" });
  try {
    const doc = docPayload(ix);
    const data = (await base44.integrations.Core.InvokeLLM({
      prompt: `${systemFor(doc)}\n\n${BRIEF_TASK}`,
      model: PLATFORM_MODEL,
      response_json_schema: BRIEF_SCHEMA,
    })) as BriefData;
    if (!data?.gist) throw new Error("The brief came back empty.");
    useStore.getState().setBrief(id, { status: "ready", data, modelKey, at: Date.now() });
  } catch (e) {
    useStore.getState().setBrief(id, {
      status: "error",
      error: e instanceof Error ? e.message : "Could not write the brief.",
    });
  }
}

/** A one-off answer outside the reader (the landing page's try-it). */
export async function streamAsk(
  body: Record<string, unknown>,
  on: { text: (full: string) => void; error?: (msg: string) => void },
  signal?: AbortSignal
) {
  try {
    const doc = body.doc as Parameters<typeof buildMessages>[0];
    const thread = body.thread as ThreadPayload;
    const history = (body.history ?? []) as { role: "user" | "assistant"; content: string }[];
    const length = (body.length ?? "normal") as LengthKey;
    const prompt = flatten(buildMessages(doc, thread, history, length));
    const out = await base44.integrations.Core.InvokeLLM({ prompt, model: PLATFORM_MODEL });
    if (!signal?.aborted) on.text(typeof out === "string" ? out.trim() : "");
  } catch (e) {
    if (!signal?.aborted) on.error?.(e instanceof Error ? e.message : "The answer could not be written.");
  }
}
