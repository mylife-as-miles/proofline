"use client";

import { textToArticle, wordCount, type Article } from "./article";
import { normalizeUrl } from "./links";
import { pdfToArticle } from "./pdf";
import { saveDoc, savePdf, useStore, type LibraryItem } from "./store";

/** `file`: the original, kept with a text when it came from one. */
export type ImportResult = { ok: true; article: Article; file?: Blob } | { ok: false; error: string; needKey?: boolean };

/**
 * A page, read by the reader service and parsed here: its Markdown comes back
 * with the title and date, and lib/article turns it into blocks.
 */
export async function importFromUrl(raw: string, onProgress?: (p: number, label?: string) => void): Promise<ImportResult> {
  const url = normalizeUrl(raw);
  onProgress?.(0.15, "Fetching the page");
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, { headers: { accept: "text/plain" } });
    if (!res.ok) return { ok: false, error: `That page answered ${res.status}. Try pasting the text instead.` };
    const md = await res.text();
    onProgress?.(0.7, "Setting the text");
    const article = pageToArticle(md, url);
    if (!article.blocks.length) return { ok: false, error: "Nothing readable was found on that page. Paste the text instead." };
    return { ok: true, article };
  } catch {
    return { ok: false, error: "Could not read that page. Check the link, or paste the text instead." };
  }
}

/** The reader service's Markdown, minus its own header, as a text. */
function pageToArticle(md: string, url: string): Article {
  const lines = md.split("\n");
  const header = (label: string) => {
    const line = lines.find((l) => l.toLowerCase().startsWith(label));
    return line ? line.slice(label.length).trim() : "";
  };
  const titled = header("title:");
  const published = header("published time:").slice(0, 4);
  const at = lines.findIndex((l) => /^markdown content:/i.test(l));
  const body = (
    at >= 0 ? lines.slice(at + 1).join("\n") : lines.filter((l) => !/^(title|url source|published time|markdown content):/i.test(l)).join("\n")
  ).trim();

  const article = textToArticle(body, { origin: "url", title: titled || undefined });
  try {
    article.source = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    /* the link had no host to name */
  }
  article.sourceUrl = url;
  if (published) article.published = published;
  return article;
}

export async function importFromFile(file: File, onProgress?: (p: number, label?: string) => void): Promise<ImportResult> {
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith(".pdf") || file.type === "application/pdf") {
      const article = await pdfToArticle(file, onProgress);
      if (article.title === "Untitled") article.title = file.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ");
      if (!article.blocks.length) return { ok: false, error: "There was no readable text in that PDF." };
      return { ok: true, article, file };
    }
    if (/\.(txt|md|markdown|text)$/.test(name) || file.type.startsWith("text/")) {
      const a = textToArticle(await file.text(), { origin: "file" });
      if (a.title === "Untitled") a.title = file.name.replace(/\.(txt|md|markdown|text)$/i, "").replace(/[_-]+/g, " ");
      a.source = file.name;
      return { ok: true, article: a };
    }
    return { ok: false, error: "Gloss reads .txt and .md files." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not read that file." };
  }
}

export function importFromText(text: string): ImportResult {
  const a = textToArticle(text, { origin: "paste" });
  return a.blocks.length ? { ok: true, article: a } : { ok: false, error: "There was no readable text in that." };
}

/**
 * Saves an imported article locally and puts it on the shelf. AI sorting is a
 * separate, explicitly confirmed library action, never part of importing.
 */
export async function keep(a: Article, file?: Blob, extra?: Partial<LibraryItem>): Promise<string | null> {
  if (!a.blocks.length) return "There was no readable text in that.";
  if (!(await saveDoc(a))) return "This browser's storage is full. Remove something from your shelf and try again.";
  // The file it came from stays beside it, in the same database.
  if (file) await savePdf(a.id, file);
  useStore.getState().addToLibrary(a, wordCount(a), extra);
  return null;
}

export const looksLikeUrl = (s: string) => /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(s.trim()) && !/\s/.test(s.trim());
