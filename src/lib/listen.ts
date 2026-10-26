"use client";

/**
 * Reading aloud, in the browser's own voice. There is no model to download and
 * no key to hold: the machine's speech engine says the words, the script is
 * split into paragraph-sized pieces so the page can follow along, and nothing
 * ever leaves this device.
 */

import { create } from "@/platform/zustand";
import { blockText, type Article } from "./article";
import { detectLanguage, pickVoiceFor } from "./language";

export const SPEEDS = [0.9, 1, 1.15];

type Task = { block: string; text: string };

type State = {
  /** A reading session is open: the bar is on screen. */
  on: boolean;
  playing: boolean;
  /** What the voice is doing while nothing is playing yet. */
  busy: string | null;
  error: string | null;
  /** Which spoken passage, of how many. */
  at: number;
  total: number;
  /** The block being read, so the page can follow along. */
  block: string | null;
  speed: number;
  start: (article: Article, from?: string | null) => void;
  toggle: () => void;
  stop: () => void;
  step: (by: number) => void;
  cycleSpeed: () => void;
};

let tasks: Task[] = [];
let index = 0;
/** Bumped to cancel whatever is being spoken. */
let run = 0;
let spoken: SpeechSynthesisUtterance | null = null;
let lastBlock: string | null = null;
/** The language being read, decided once when a session opens. */
let lang = "en";

const synth = (): SpeechSynthesis | null =>
  typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;

/** Long paragraphs are said in sentence-sized pieces: steady, and easy to follow. */
function pieces(text: string): string[] {
  const out: string[] = [];
  let buf = "";
  for (const part of text.split(/(?<=[.!?…:])\s+/)) {
    if (buf && buf.length + part.length > 280) {
      out.push(buf);
      buf = part;
    } else buf = buf ? `${buf} ${part}` : part;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

function script(article: Article): Task[] {
  const list: Task[] = [];
  for (const b of article.blocks) {
    if (b.type === "figure") continue;
    const text = (b.type === "table" && b.rows ? b.rows.map((r) => r.join(", ")).join(". ") : blockText(b)).replace(/\s+/g, " ").trim();
    if (!text) continue;
    for (const piece of pieces(text)) list.push({ block: b.id, text: piece });
  }
  return list;
}

/** Some browsers hand over their voices a beat after the page opens. */
function voicesReady(s: SpeechSynthesis): Promise<void> {
  if (s.getVoices().length) return Promise.resolve();
  return new Promise((done) => {
    let poll = 0;
    const settle = () => {
      s.removeEventListener("voiceschanged", settle);
      clearInterval(poll);
      done();
    };
    s.addEventListener("voiceschanged", settle);
    // Some engines never fire the event: look again, then read with the language alone.
    poll = window.setInterval(() => {
      if (s.getVoices().length) settle();
    }, 200);
    setTimeout(settle, 2500);
  });
}

/** Scroll the page to the paragraph being read. */
function follow(block: string | null) {
  if (!block || block === lastBlock) return;
  lastBlock = block;
  const el = document.querySelector<HTMLElement>(`.prose-read [data-block="${CSS.escape(block)}"]`);
  el?.scrollIntoView({ block: "center", behavior: "smooth" });
}

function silence() {
  spoken = null;
  synth()?.cancel();
}

/** Say one passage; resolves when it finishes, or when the session moves on. */
function speakOne(text: string, speed: number, mine: number): Promise<"done" | "stopped"> {
  const s = synth();
  if (!s) return Promise.resolve("stopped");
  return new Promise((done) => {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = speed;
    // The language is always declared, so the engine can choose its own voice
    // even when this machine lists none of its own.
    const v = pickVoiceFor(s.getVoices(), lang);
    u.lang = v ? v.lang : lang;
    if (v) u.voice = v;
    spoken = u;
    const settle = (ok: boolean) => {
      u.onend = null;
      u.onerror = null;
      if (spoken === u) spoken = null;
      done(ok ? "done" : "stopped");
    };
    u.onend = () => settle(mine === run);
    u.onerror = (e: SpeechSynthesisErrorEvent) => {
      const gone = e.error === "interrupted" || e.error === "canceled";
      if (!gone && mine === run) {
        const why =
          e.error === "language-unavailable" || e.error === "voice-unavailable"
            ? `This device has no voice for ${lang}.`
            : e.error === "not-allowed"
              ? "The browser held the voice back. Tap the page, then try again."
              : `The voice stopped: ${e.error}`;
        listen.setState({ playing: false, busy: null, error: why });
      }
      settle(gone && mine === run);
    };
    s.speak(u);
  });
}

async function readAll(mine: number) {
  while (mine === run && index < tasks.length) {
    const task = tasks[index];
    follow(task.block);
    listen.setState({ block: task.block, at: index, busy: null });
    const how = await speakOne(task.text, listen.getState().speed, mine);
    if (mine !== run || how === "stopped") return;
    index += 1;
  }
  if (mine !== run) return;
  listen.setState({ on: false, playing: false, block: null, busy: null, at: 0, total: 0 });
  tasks = [];
  index = 0;
  lastBlock = null;
}

function begin(i: number) {
  const s = synth();
  if (!s || !tasks.length) return;
  silence();
  run += 1;
  const mine = run;
  index = Math.max(0, Math.min(i, tasks.length - 1));
  lastBlock = null;
  listen.setState({ on: true, playing: true, error: null, busy: "Waking the voice…", at: index, total: tasks.length, block: tasks[index].block });
  void (async () => {
    await voicesReady(s);
    if (mine !== run) return;
    listen.setState({ busy: null });
    void readAll(mine);
  })();
}

/** The first passage of a block, or the nearest one at or after it. */
function atBlock(id: string | null | undefined) {
  if (!id) return 0;
  const exact = tasks.findIndex((t) => t.block === id);
  return exact < 0 ? 0 : exact;
}

export const listen = create<State>((set, get) => ({
  on: false,
  playing: false,
  busy: null,
  error: null,
  at: 0,
  total: 0,
  block: null,
  speed: 1,

  start: (article, from_) => {
    if (!synth()) {
      set({ on: true, playing: false, error: "This browser cannot read aloud." });
      return;
    }
    tasks = script(article);
    index = 0;
    // Read it in the language it was written in.
    lang = detectLanguage(tasks.map((t) => t.text).join(" "));
    if (!tasks.length) {
      set({ on: true, playing: false, error: "There is nothing here to read aloud." });
      return;
    }
    begin(atBlock(from_));
  },

  toggle: () => {
    const s = synth();
    if (!get().on || !tasks.length || !s) return;
    if (get().playing) {
      s.pause();
      set({ playing: false });
      return;
    }
    set({ playing: true, error: null });
    if (s.paused) s.resume();
    else if (!spoken) begin(index);
  },

  stop: () => {
    run += 1;
    silence();
    tasks = [];
    index = 0;
    lastBlock = null;
    set({ on: false, playing: false, busy: null, error: null, at: 0, total: 0, block: null });
  },

  step: (by) => {
    if (!tasks.length) return;
    const here = tasks[index]?.block;
    const first = tasks.findIndex((t) => t.block === here);
    const stops = tasks.map((t, i) => (i === 0 || t.block !== tasks[i - 1].block ? i : -1)).filter((i) => i >= 0);
    const cur = stops.indexOf(first < 0 ? index : first);
    const next = stops[Math.max(0, Math.min(stops.length - 1, cur + by))];
    begin(next ?? 0);
  },

  cycleSpeed: () => {
    const speed = SPEEDS[(SPEEDS.indexOf(get().speed) + 1) % SPEEDS.length];
    set({ speed });
    // The current passage is said again at the new pace.
    if (tasks.length) begin(tasks.findIndex((t) => t.block === tasks[index]?.block));
  },
}));

export const useListen = listen;
