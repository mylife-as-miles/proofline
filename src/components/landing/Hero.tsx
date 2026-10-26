"use client";

import { useRef, type ReactNode } from "react";
import { MagnifierLens } from "./MagnifierLens";

/**
 * The landing's top: what the app asks of a reader, in two lines, then the
 * supporting line and the place to start.
 * "Question it." is marked the way a reader marks: the wash, then the pen under it.
 * The magnifier lives here and nowhere else: over the headline it is the pointer.
 */
export function Hero({ children }: { children: ReactNode }) {
  const title = useRef<HTMLHeadingElement>(null);
  return (
    <section className="mx-auto flex w-full max-w-[980px] flex-col items-center px-6 text-center sm:px-10">
      <h1 ref={title} className="hero-title lens-zone font-serif text-ink">
        <span className="block">
          Don’t just <span className="hero-mark">read it</span>.
        </span>
        <span className="block">Question all of it.</span>
      </h1>
      {children}
      <MagnifierLens zone={title} />
    </section>
  );
}
