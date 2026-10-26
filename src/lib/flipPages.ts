/** Lays a text out into fixed-size leaves for the page-flip view. */

import type { Block } from "./article";

/** One leaf: its body as HTML, the block it starts at, and the share of the text behind it. */
export type FlipLeaf = { html: string; block: string; pct: number };

type Tok = { t: string; em?: boolean; strong?: boolean; code?: boolean; href?: string };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const TAG: Record<string, string> = { p: "p", quote: "blockquote", li: "p", note: "p", pre: "pre", h2: "h2", h3: "h3" };
const CLS: Record<string, string> = { li: "flip-li", note: "flip-note" };

/** Blocks that cannot be broken across a page. */
const atomic = (b: Block) => b.type === "pre" || b.type === "h2" || b.type === "h3" || b.type === "table";

function tokensOf(b: Block): Tok[] {
  const out: Tok[] = [];
  for (const r of b.runs) {
    for (const part of r.text.split(/(\s+)/)) {
      if (part) out.push({ t: part, em: r.em, strong: r.strong, code: r.code, href: r.href });
    }
  }
  return out;
}

function tokensHtml(toks: Tok[]): string {
  let out = "";
  for (const k of toks) {
    let h = esc(k.t);
    if (k.code) h = `<code>${h}</code>`;
    if (k.em) h = `<em>${h}</em>`;
    if (k.strong) h = `<strong>${h}</strong>`;
    if (k.href) h = `<a href="${esc(k.href)}" rel="noreferrer" target="_blank">${h}</a>`;
    out += h;
  }
  return out;
}

function tableHtml(b: Block): string {
  return (b.rows ?? []).map((r) => `<span class="flip-row">${r.map(esc).join(" · ")}</span>`).join("<br/>");
}

function el(tag: string, cls: string, html: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  node.innerHTML = html;
  return node;
}

/**
 * Flow the blocks into pages of the given content box, measured in the real
 * type so nothing is cut off and nothing is dropped. Returns one leaf per page.
 */
export function paginate(blocks: Block[], width: number, height: number): FlipLeaf[] {
  if (typeof document === "undefined" || width < 80 || height < 80) return [];

  const probe = document.createElement("div");
  probe.className = "flip-body";
  probe.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;visibility:hidden;pointer-events:none;`;
  document.body.appendChild(probe);

  const leaves: FlipLeaf[] = [];
  let page: string[] = [];
  let start: { block: string; pct: number } | null = null;
  let done = 0;

  const total =
    blocks.reduce((n, b) => n + (atomic(b) ? 1 : b.type === "figure" ? 0 : tokensOf(b).length), 0) || 1;

  const add = (html: string, block: string, used: number) => {
    if (!page.length) start = { block, pct: Math.min(0.99, done / total) };
    page.push(html);
    // Keep the page in the probe too, so the next fit test measures what is
    // already on the leaf rather than the candidate alone.
    probe.insertAdjacentHTML("beforeend", html);
    done += used;
  };

  const flush = () => {
    if (page.length && start) leaves.push({ html: page.join(""), ...start });
    page = [];
    start = null;
    probe.innerHTML = "";
  };

  const place = (node: HTMLElement, block: string, used: number) => {
    while (page.length) {
      probe.appendChild(node);
      const fits = probe.scrollHeight <= height;
      node.remove();
      if (fits) {
        add(node.outerHTML, block, used);
        return;
      }
      flush();
    }
    add(node.outerHTML, block, used);
  };

  for (const b of blocks) {
    if (b.type === "figure") continue;
    if (b.type === "table") {
      place(el("p", "flip-table", tableHtml(b)), b.id, 1);
      continue;
    }

    const toks = tokensOf(b);
    if (!toks.length) continue;
    const tag = TAG[b.type] ?? "p";
    const cls = CLS[b.type] ?? "";

    if (atomic(b)) {
      place(el(tag, cls, tokensHtml(toks)), b.id, toks.length);
      continue;
    }

    let rest = toks;
    while (rest.length) {
      const whole = el(tag, cls, tokensHtml(rest));
      probe.appendChild(whole);
      const fits = probe.scrollHeight <= height;
      whole.remove();
      if (fits) {
        add(whole.outerHTML, b.id, rest.length);
        break;
      }

      // How much of this paragraph fits in what is left of the page.
      let lo = 0;
      let hi = rest.length - 1;
      let best = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const test = el(tag, cls, tokensHtml(rest.slice(0, mid + 1)));
        probe.appendChild(test);
        const ok = probe.scrollHeight <= height;
        test.remove();
        if (ok) {
          best = mid + 1;
          lo = mid + 1;
        } else hi = mid - 1;
      }

      if (best === 0) {
        if (page.length) {
          flush();
          continue;
        }
        best = 1;
      }

      add(el(tag, cls, tokensHtml(rest.slice(0, best))).outerHTML, b.id, best);
      rest = rest.slice(best);
      if (rest.length) flush();
    }
  }

  flush();
  probe.remove();
  return leaves;
}
