/**
 * The reading theme, put on <html> before React mounts, so a reader who chose
 * night or sepia never sees a flash of paper. Same keys as lib/settings.ts.
 */
try {
  const s = JSON.parse(localStorage.getItem("gloss:settings") || "{}");
  const el = document.documentElement;
  let theme = s.theme || "auto";
  if (theme === "auto") theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "paper";
  el.dataset.theme = theme;
  el.dataset.pen = s.pen || "vermilion";
  el.dataset.face = s.face || "serif";
  el.dataset.align = s.align || "left";
  el.dataset.paras = s.paras || "spaced";
  if (s.size) el.style.setProperty("--read-size", `${s.size}px`);
  const leading = { tight: 1.5, normal: 1.64, loose: 1.82 };
  const measure = { narrow: 28, normal: 32, wide: 37 };
  if (s.leading && leading[s.leading]) el.style.setProperty("--leading", String(leading[s.leading]));
  if (s.width && measure[s.width]) el.style.setProperty("--measure-k", String(measure[s.width]));
} catch {
  /* first visit, or storage unavailable */
}
