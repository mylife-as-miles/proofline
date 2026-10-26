import { Fragment } from "react";

/**
 * React 19's <ViewTransition> names a subtree for the browser's view
 * transitions. React 18 has none, so this simply renders its children: the
 * library still cross-fades through its own CSS.
 */
export function ViewTransition({ children }) {
  return <Fragment>{children}</Fragment>;
}
