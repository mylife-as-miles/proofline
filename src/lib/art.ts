/**
 * The shelf's printed devices, drawn in the browser as SVG data URIs: a plate
 * for a topic, a colophon mark for an icon. Nothing here is fetched, so no
 * cover, plate or glyph can come up blank.
 */

const PAPER = "#f4ecd9";
const CREAM = "#f6efe2";

const uri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rand(seed: number) {
  let a = seed || 1;
  return () => {
    a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

const n = (v: number) => v.toFixed(1);

/**
 * A printed plate: warm paper, a ringed sun low over a hatched sea, the whole
 * thing framed like a bookplate. The ink is the topic's, the composition its own.
 */
export function plateArt(ink: string, pale: string, version = ""): string {
  const r = rand(seedOf(`${ink}:${version}`));
  const cx = 88 + r() * 44;
  const cy = 90 + r() * 6;
  const rad = 38 + r() * 12;
  const horizon = 134 + r() * 12;
  const rays = 9 + Math.floor(r() * 5);

  let spokes = "";
  for (let i = 0; i < rays; i++) {
    const a = Math.PI + (Math.PI * i) / (rays - 1);
    const from = rad + 7;
    const to = from + 9 + r() * 8;
    spokes += `<line x1="${n(cx + Math.cos(a) * from)}" y1="${n(cy + Math.sin(a) * from)}" x2="${n(
      cx + Math.cos(a) * to,
    )}" y2="${n(cy + Math.sin(a) * to)}"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 200" width="220" height="200">
<defs><pattern id="h" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
<line x1="0" y1="0" x2="0" y2="6" stroke="${ink}" stroke-width="1" stroke-opacity="0.45"/></pattern></defs>
<rect width="220" height="200" fill="${PAPER}"/>
<rect width="220" height="200" fill="${pale}" opacity="0.3"/>
<rect x="0" y="${n(horizon)}" width="220" height="${n(200 - horizon)}" fill="url(#h)"/>
<line x1="0" y1="${n(horizon)}" x2="220" y2="${n(horizon)}" stroke="${ink}" stroke-width="1" stroke-opacity="0.75"/>
<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(rad)}" fill="${ink}" fill-opacity="0.12"/>
<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(rad)}" fill="none" stroke="${ink}" stroke-width="1.1" stroke-opacity="0.85"/>
<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(rad - 9)}" fill="none" stroke="${ink}" stroke-width="0.7" stroke-opacity="0.6"/>
<g stroke="${ink}" stroke-width="0.8" stroke-opacity="0.55">${spokes}</g>
<rect x="9" y="9" width="202" height="182" fill="none" stroke="${ink}" stroke-width="0.8" stroke-opacity="0.45"/>
</svg>`;
  return uri(svg);
}

/* ---------- colophon marks: one engraved device per topic and tag ---------- */

const MARKS: Record<string, string> = {
  ai: "M12 4v3.2M12 16.8V20M4 12h3.2M16.8 12H20M6.6 6.6l2.2 2.2M15.2 15.2l2.2 2.2M17.4 6.6l-2.2 2.2M8.8 15.2l-2.2 2.2M12 9.6a2.4 2.4 0 100 4.8 2.4 2.4 0 000-4.8",
  programming: "M9.5 7.8L5 12l4.5 4.2M14.5 7.8L19 12l-4.5 4.2M13 5.6l-2 12.8",
  infra: "M4.5 6.2h15v5h-15zM4.5 12.8h15v5h-15zM8 8.7h.01M8 15.3h.01",
  data: "M4.4 19.4V5M4.4 19.4h16M8.4 16.4v-3.6M12.4 16.4V8M16.4 16.4v-6",
  security: "M12 4l7 2.6v5.1c0 4.2-3 7-7 8.3-4-1.3-7-4.1-7-8.3V6.6zM12 11.2v2.8",
  tech: "M12 3.6a8.4 8.4 0 100 16.8 8.4 8.4 0 000-16.8M3.6 12h16.8M12 3.6c3.6 3.6 3.6 13.2 0 16.8M12 3.6c-3.6 3.6-3.6 13.2 0 16.8",
  design: "M12 4l6.6 16-6.6-3.8L5.4 20zM12 4v12.2",
  product: "M12 3.8l7.4 4.2-7.4 4.2L4.6 8zM4.6 8v8l7.4 4.2V12.2M19.4 8v8L12 20.2",
  startups: "M13.4 3.6L6 13.4h4.6L10.2 20.4 18 10.6h-4.6z",
  business: "M4 8.6h16v10.2H4zM9 8.6V6.2h6v2.4M4 13.2h16",
  work: "M12 4a8 8 0 100 16 8 8 0 000-16M15.2 8.8l-2.1 4.3-4.3 2.1 2.1-4.3z",
  economics: "M12 4v16M6 20h12M4 9h16M7.2 9l-2.6 4.6h5.2zM16.8 9l-2.6 4.6h5.2z",
  money: "M12 4.4v15.2M15.2 7.4c-1.5-1-6.4-1.1-6.4 2 0 2.9 6.6 2.2 6.6 4.9 0 3-4.9 2.8-6.4 1.8",
  science: "M9.4 4h5.2M10.4 4v5.6l-4.8 8.1A1.8 1.8 0 007.2 20h9.6a1.8 1.8 0 001.6-2.3l-4.8-8.1V4M8.4 14.6h7.2",
  health: "M12 20.2c-1.2-1-7-4.6-7-9.1A3.9 3.9 0 0112 8.6a3.9 3.9 0 017 2.5c0 4.5-5.8 8.1-7 9.1z",
  mind: "M9.4 15.6a5.6 5.6 0 116.2 0V18H9.4zM10 21h4M12 18v3",
  climate: "M19.4 4.6C10.6 4.6 4.6 9.4 4.6 19.4 14.6 19.4 19.4 13.4 19.4 4.6M6.8 17.2L15.6 8.4",
  philosophy: "M5 8.6h14M6.6 8.6v9.8M12 8.6v9.8M17.4 8.6v9.8M4 19.4h16M12 4.6l7 4H5z",
  history: "M7 4.6h10M7 19.4h10M8 4.6c0 4 4 5 4 7.4s-4 3.4-4 7.4M16 4.6c0 4-4 5-4 7.4s4 3.4 4 7.4",
  politics: "M6.4 20.4V4.4M6.4 5.2c4.4-1.8 8.4 1.8 11.2 0v8.4c-2.8 1.8-6.8-1.8-11.2 0",
  culture: "M4.4 7.4c4.6 2.2 10.6 2.2 15.2 0v4.2c0 4.8-3.4 7.8-7.6 7.8s-7.6-3-7.6-7.8zM8.6 11.6h.01M15.4 11.6h.01",
  writing: "M18.6 5.4C11 5.4 6.6 10 5.4 18.6 14 17.4 18.6 13 18.6 5.4M5.4 18.6l7.2-7.2",
  learning: "M12 7c-2.4-1.8-5.4-2-8.4-1.4v12.8c3-.6 6-.4 8.4 1.4 2.4-1.8 5.4-2 8.4-1.4V5.6c-3-.6-6-.4-8.4 1.4M12 7v12.8",
  living: "M6 9h11v5.4a5.4 5.4 0 01-10.8 0zM17 10.4h1.6a2.4 2.4 0 010 4.8H17M9.6 5.8c.8-.9.8-1.7 0-2.6M13.2 5.8c.8-.9.8-1.7 0-2.6",
  unsorted: "M4.6 4.6h6v6h-6zM13.4 4.6h6v6h-6zM4.6 13.4h6v6h-6zM13.4 13.4h6v6h-6z",
  favorite: "M12 4.4l2.4 5.2 5.6.6-4.2 3.8 1.2 5.6-5-3-5 3 1.2-5.6-4.2-3.8 5.6-.6z",
  reading: "M7.4 4.6h9.2v15l-4.6-3.4-4.6 3.4z",
  finished: "M5.6 12.4l4.2 4.2 8.6-8.6",
  quick: "M12 4.6a7.4 7.4 0 100 14.8 7.4 7.4 0 000-14.8M12 8v4.4l3 1.8",
  long: "M7.6 4.6h8.8M7.6 19.4h8.8M8.6 4.6c0 3.6 3.4 4.6 3.4 7.4s-3.4 3.8-3.4 7.4M15.4 4.6c0 3.6-3.4 4.6-3.4 7.4s3.4 3.8 3.4 7.4",
  agent: "M12 4.4l1.8 4.8 4.8 1.8-4.8 1.8L12 17.6l-1.8-4.8L5.4 11l4.8-1.8z",
};

/** A small device in the topic's ink, stamped on a cream disc so it reads on cloth and on paper. */
export function glyphArt(key: string, ink: string): string {
  const mark = MARKS[key] ?? MARKS.unsorted;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
<circle cx="12" cy="12" r="11.3" fill="${CREAM}" stroke="${ink}" stroke-opacity="0.3" stroke-width="1"/>
<path d="${mark}" fill="none" stroke="${ink}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
  return uri(svg);
}
