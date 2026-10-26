import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Library as LibraryIcon } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function TopBar({ children }) {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 2);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className={`topbar ${scrolled ? "is-frosted" : ""}`}>
      <div className="flex items-center gap-5">
        <Link to="/" className="wordmark">
          Proofline
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          <Link to="/library" className={`tb-link ${pathname.startsWith("/library") ? "is-active" : ""}`}>
            Library
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-1">
        {children}
        <Link to="/library" className="tb-icon sm:hidden" aria-label="Library">
          <LibraryIcon size={17} />
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
