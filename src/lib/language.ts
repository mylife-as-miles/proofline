"use client";

/**
 * Which language a text is written in, and which installed voice should say it.
 * Decided from the words themselves, so a French essay is read in French on a
 * machine whose own language is English.
 */

const SCRIPTS: [RegExp, string][] = [
  [/[\u0400-\u04FF]/g, "ru"],
  [/[\u0370-\u03FF]/g, "el"],
  [/[\u0590-\u05FF]/g, "he"],
  [/[\u0600-\u06FF]/g, "ar"],
  [/[\u0900-\u097F]/g, "hi"],
  [/[\u3040-\u30FF]/g, "ja"],
  [/[\uAC00-\uD7AF]/g, "ko"],
  [/[\u4E00-\u9FFF]/g, "zh"],
  [/[\u0E00-\u0E7F]/g, "th"],
];

/** The words that give a Latin-script language away. */
const WORDS: Record<string, string[]> = {
  en: ["the", "and", "of", "to", "that", "is", "in", "it", "you", "for", "with", "but", "not", "this", "as", "are", "was", "have"],
  es: ["el", "la", "los", "las", "de", "que", "y", "en", "un", "una", "por", "con", "para", "es", "su", "como", "pero", "más", "del"],
  fr: ["le", "la", "les", "des", "de", "et", "que", "un", "une", "dans", "pour", "est", "sur", "pas", "au", "avec", "ce", "plus", "du"],
  de: ["der", "die", "das", "und", "ist", "den", "von", "zu", "mit", "sich", "auf", "nicht", "dem", "des", "ein", "eine", "auch", "werden"],
  it: ["il", "la", "di", "che", "e", "un", "una", "per", "con", "non", "sono", "del", "della", "gli", "le", "come", "più", "anche"],
  pt: ["os", "as", "de", "que", "e", "um", "uma", "para", "com", "não", "do", "da", "em", "seu", "mais", "como", "pelo", "é"],
  nl: ["de", "het", "een", "en", "van", "dat", "op", "te", "zijn", "met", "voor", "niet", "aan", "er", "maar", "ook", "worden"],
  sv: ["och", "att", "det", "som", "en", "på", "är", "av", "för", "med", "den", "till", "inte", "har", "om"],
  da: ["og", "at", "det", "som", "en", "på", "er", "af", "for", "med", "den", "til", "ikke", "har", "om"],
  nb: ["og", "at", "det", "som", "en", "på", "er", "av", "for", "med", "den", "til", "ikke", "har", "om"],
  pl: ["i", "w", "nie", "na", "z", "że", "do", "się", "jest", "to", "jak", "ale", "po", "dla", "przez"],
  tr: ["ve", "bir", "bu", "için", "ile", "de", "da", "olarak", "çok", "daha", "ama", "gibi", "her"],
  id: ["dan", "yang", "di", "ini", "itu", "dengan", "untuk", "tidak", "dari", "akan", "pada", "juga", "adalah"],
};

const latinWords = (text: string) => text.toLowerCase().replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter(Boolean);

/** The language a text is written in, as a bare tag such as "en" or "es". */
export function detectLanguage(text: string): string {
  const sample = text.slice(0, 5000);
  const letters = sample.replace(/[^\p{L}]/gu, "").length || 1;
  for (const [re, tag] of SCRIPTS) {
    if ((sample.match(re) ?? []).length / letters > 0.2) return tag;
  }
  const words = latinWords(sample);
  let best = "";
  let top = 0;
  for (const [tag, set] of Object.entries(WORDS)) {
    const bag = new Set(set);
    let score = 0;
    for (const w of words) if (bag.has(w)) score += 1;
    if (score > top) {
      top = score;
      best = tag;
    }
  }
  if (best && top >= Math.max(3, words.length * 0.03)) return best;
  const nav = typeof navigator !== "undefined" ? navigator.language || "" : "";
  return (nav.split("-")[0] || "en").toLowerCase();
}

const norm = (tag: string) => tag.toLowerCase().replace(/_/g, "-");
export const base = (tag: string) => norm(tag).split("-")[0];

type Voice = { lang: string; name: string; localService?: boolean };

/** The best installed voice for a language: exact tag, then its family, else none. */
export function pickVoiceFor<T extends Voice>(voices: T[], lang: string): T | null {
  if (!voices.length) return null;
  const want = norm(lang);
  const exact = voices.filter((v) => norm(v.lang) === want);
  const family = voices.filter((v) => base(v.lang) === base(want));
  const pool = exact.length ? exact : family;
  if (!pool.length) return null;
  return pool.find((v) => v.localService) ?? pool[0];
}
