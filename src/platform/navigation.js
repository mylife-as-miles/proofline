import { useLocation, useNavigate } from "react-router-dom";

/** next/navigation, on react-router. */
export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (to) => navigate(to),
    replace: (to) => navigate(to, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    refresh: () => {},
    prefetch: () => {},
  };
}

export function usePathname() {
  return useLocation().pathname;
}
