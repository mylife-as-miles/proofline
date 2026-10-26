// All coordinates stay in the reader's own scroll region; other pages use the window.
export const readingRegion = () => document.querySelector('[data-reading-scroll]');
export const readingTop = () => readingRegion()?.scrollTop ?? window.scrollY;
export const readingHeight = () => readingRegion()?.clientHeight ?? window.innerHeight;
export const readingStart = () => readingRegion()?.getBoundingClientRect().top ?? 0;
export const readingBottom = () => readingRegion()?.getBoundingClientRect().bottom ?? window.innerHeight;
export const readingMax = () => {
  const region = readingRegion();
  return region ? region.scrollHeight - region.clientHeight : document.documentElement.scrollHeight - window.innerHeight;
};
export const scrollReadingTo = (options) => (readingRegion() ?? window).scrollTo(options);
export const scrollReadingBy = (options) => (readingRegion() ?? window).scrollBy(options);
export const scrollReadingToElement = (el, fraction = .28, behavior = 'smooth') => scrollReadingTo({
  top: Math.max(0, readingTop() + el.getBoundingClientRect().top - readingStart() - readingHeight() * fraction),
  behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : behavior,
});
