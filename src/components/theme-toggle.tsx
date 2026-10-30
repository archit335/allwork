"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the theme the head script applied
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  const toggle = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch {}
    setTheme(next);
  };

  const isLight = theme === "light";
  return (
    <button
      type="button"
      onClick={toggle}
      className="grid size-10 place-items-center rounded-lg text-stone-700 transition hover:bg-stone-100"
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      title={isLight ? "Dark mode" : "Light mode"}
    >
      {theme === null ? <span className="size-5" /> : isLight ? <Moon className="size-5" /> : <Sun className="size-5 text-zap-300" />}
    </button>
  );
}
