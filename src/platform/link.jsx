import { Link as RouterLink } from "react-router-dom";

/** next/link, on react-router: in-app paths get a client-side link, anything else an anchor. */
export default function Link({ href, replace, scroll, prefetch, children, ...rest }) {
  const to = typeof href === "string" ? href : href?.pathname ?? "/";
  const external = /^(https?:)?\/\//i.test(to) || to.startsWith("mailto:") || to.startsWith("#");
  if (external) {
    const rel = rest.target === "_blank" ? "noreferrer" : rest.rel;
    return (
      <a href={to} {...rest} rel={rel}>
        {children}
      </a>
    );
  }
  return (
    <RouterLink to={to} replace={replace} {...rest}>
      {children}
    </RouterLink>
  );
}
