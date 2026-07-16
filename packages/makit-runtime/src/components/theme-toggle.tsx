"use client";

import { useEffect, useState } from "react";
import { THEME_STORAGE_KEY } from "../theme/theme-script.js";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | undefined>(undefined);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (private browsing, disabled storage) — theme just won't persist.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle color theme"
      className="rounded-[var(--makit-radius)] p-2 text-[var(--makit-color-foreground)] hover:bg-[var(--makit-color-muted)]"
    >
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  );
}
