import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "proofline:theme";
const ORDER = ["paper", "snow", "night"];

export default function ThemeToggle({ className = "" }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(KEY) || "paper";
    } catch {
      return "paper";
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {}
  }, [theme]);

  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
  const dark = theme === "night";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className={`tb-icon ${className}`}
      aria-label={`Change the page to ${next}`}
      title={`Page: ${theme}`}
    >
      {dark ? <Moon size={17} /> : <Sun size={17} />}
    </button>
  );
}
