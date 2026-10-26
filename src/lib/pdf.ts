"use client";

import { getDocumentProxy } from "unpdf";
import { textToArticle, type Article } from "./article";

/**
 * A PDF into blocks, in the browser, with no server and no key.
 *
 * unpdf opens the file and hands back pdf.js's document proxy; pdf.js then
 * reads the text layer page by page, item by item, and the items are gathered
 * back into lines by where they sit down the page. Lines are hard-wrapped, so
 * they are joined into paragraphs — a line that ends in a full stop, or a short
 * line that does not run on, starts the next. A page with no text layer at all
 * (a scan, a picture of text) reads as empty and is said so, rather than
 * guessed at.
 */

/** At most this many pages are read; a whole bound book is not what the shelf is for. */
export const PDF_MAX_PAGES = 400;

/** A page number, a running head: furniture, not text. */
const FURNITURE = /^(?:page\s*)?\d{1,4}(?:\s*(?:of|\/)\s*\d{1,4})?$/i;

export class PdfError extends Error {}

export type PdfProgress = (pct: number, label?: string) => void;

type TextItem = { str?: string; hasEOL?: boolean; transform?: number[] };
type Doc = Awaited<ReturnType<typeof getDocumentProxy>>;

/** One page's lines: pdf.js's items, gathered by where they sit down the page. */
async function pageLines(pdf: Doc, n: number): Promise<string> {
  const page = await pdf.getPage(n);
  const content = await page.getTextContent();
  const lines: string[] = [];
  let cur = "";
  let y: number | null = null;
  for (const item of content.items as TextItem[]) {
    const ny = item.transform ? Math.round(item.transform[5]) : y;
    if (cur && y !== null && ny !== null && Math.abs(ny - y) > 2) {
      lines.push(cur);
      cur = "";
    }
    cur += item.str ?? "";
    if (item.hasEOL) {
      lines.push(cur);
      cur = "";
      y = null;
      continue;
    }
    if (ny !== null) y = ny;
  }
  if (cur) lines.push(cur);
  return lines
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l && !FURNITURE.test(l))
    .join("\n");
}

/** Hard-wrapped lines back into paragraphs. */
function reflow(page: string): string {
  const out: string[] = [];
  let para = "";
  for (const line of page.split("\n")) {
    if (!para) {
      para = line;
      continue;
    }
    // A word broken across two lines.
    if (/[a-z]-$/i.test(para) && /^[a-z]/.test(line)) para = para.slice(0, -1) + line;
    // The line before ended a sentence and this one starts a new one.
    else if (/[.!?:”"’)\]]$/.test(para) && /^[A-Z0-9“‘"(]/.test(line)) {
      out.push(para);
      para = line;
    }
    // A short line that does not run on: a heading, a caption, a list item.
    else if (para.length < 60 && !/[,;:—–-]$/.test(para) && /^[A-Z0-9“‘"(]/.test(line)) {
      out.push(para);
      para = line;
    } else para = `${para} ${line}`;
  }
  if (para) out.push(para);
  return out.join("\n\n");
}

export async function pdfToArticle(file: File, onProgress?: PdfProgress): Promise<Article> {
  const bytes = new Uint8Array(await file.arrayBuffer());

  let pdf: Doc;
  try {
    pdf = await getDocumentProxy(bytes);
  } catch (e) {
    throw new PdfError(
      /password/i.test(String(e)) ? "This PDF is password protected. Remove the password and try again." : "Could not read this PDF."
    );
  }

  const total = pdf.numPages;
  const pages = Math.min(total, PDF_MAX_PAGES);
  const label = `${pages} page${pages === 1 ? "" : "s"}`;
  onProgress?.(0, `Reading ${label}`);

  const read: string[] = [];
  for (let n = 1; n <= pages; n++) {
    let lines = "";
    try {
      lines = await pageLines(pdf, n);
    } catch {
      /* a page that will not open simply reads as empty */
    }
    read.push(reflow(lines));
    onProgress?.(0.1 + (0.8 * n) / pages, `Reading ${label}`);
  }

  const body = read.join("\n\n").trim();
  if (!body) throw new PdfError("This PDF has no text layer — it looks like a scan of pages. Paste its text instead.");

  // The file's own title, when it has one; otherwise the first line stands in.
  let title = "";
  try {
    const meta = (await pdf.getMetadata()) as { info?: { Title?: string } };
    title = (meta.info?.Title ?? "").trim();
  } catch {
    /* a PDF without metadata still reads */
  }

  const article = textToArticle(body, { origin: "file", title: title || undefined });
  article.source = file.name;
  onProgress?.(1, "Done");
  return article;
}
