/**
 * The model allow-list and wire types. Safe to import on the client: no keys,
 * no keys. lib/ask.ts does the network side.
 */

export type ModelEntry = {
  id: string;
  label: string;
  short: string;
  blurb: string;
  inPerM: number;
  cachedPerM: number;
  outPerM: number;
};

/**
 * The allow-list. Route and UI both read it. Gemini Flash answers
 * everything: one model, quick enough for a margin note and steady enough for
 * a whole-text brief. Older answers and settings may still name another model;
 * anything that looks one up goes through modelOf(), which falls back to Flash.
 */
export const MODELS = {
  flash: {
    id: "gemini-3.8-flash",
    label: "Gemini Flash",
    short: "Quick",
    blurb: "Answers in about a second. Best for most questions.",
    inPerM: 0.3,
    cachedPerM: 0.03,
    outPerM: 2.5,
  },
} as const satisfies Record<string, ModelEntry>;

/** The platform's slug for the model above: Gemini Flash answers every call. */
export const PLATFORM_MODEL = "gemini_3_flash";

/** One turn of a thread, as the prompts build it. */
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ModelKey = keyof typeof MODELS;
export const DEFAULT_MODEL: ModelKey = "flash";

export function isModelKey(v: unknown): v is ModelKey {
  return typeof v === "string" && v in MODELS;
}

/** A model key that is still on the list: a saved "pro" from before Deep was dropped becomes Flash. */
export const modelOf = (v: unknown): ModelKey => (isModelKey(v) ? v : DEFAULT_MODEL);

export type Usage = {
  promptTokens: number;
  cachedTokens: number;
  completionTokens: number;
  costUsd: number;
};

/** Dollars for a run. Cached prompt tokens bill at the cached rate. */
export function costFor(key: ModelKey, prompt: number, cached: number, completion: number): number {
  const m: ModelEntry = MODELS[key];
  const fresh = Math.max(0, prompt - cached);
  return (fresh * m.inPerM + cached * m.cachedPerM + completion * m.outPerM) / 1_000_000;
}

/** A web result an answer can cite as [n]. */
export type Source = { n: number; title: string; url: string; site: string; date?: string };

export type StreamEvent =
  | { type: "meta"; model: string }
  | { type: "searching" }
  /** The model asked for a tool (web search); the route runs it and asks again. Never sent to the browser. */
  | { type: "tool"; id: string; name: string; args: string }
  /** Drop what was written so far: a line before a tool call ("I'll look that up") that the real answer replaces. */
  | { type: "reset" }
  | { type: "sources"; sources: Source[] }
  | { type: "content"; text: string }
  | { type: "usage"; usage: Usage }
  | { type: "done" }
  | { type: "error"; text: string };
