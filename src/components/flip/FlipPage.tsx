import { forwardRef, type ReactNode } from "react";

/** One leaf of the flip book. The library takes it over and moves it in 3D. */
const Leaf = forwardRef<HTMLDivElement, { children: ReactNode; className?: string; pad: number }>(
  function Leaf({ children, className = "", pad }, ref) {
    return (
      <div ref={ref} className={`flip-page ${className}`} style={{ padding: pad }}>
        {children}
      </div>
    );
  }
);

export default Leaf;
