"use client";

import { useEffect, useState } from "react";
// A client component imports values from `/client`, never from the package's
// main entry — that one also re-exports the filesystem-backed data loaders.
import { THEME_STORAGE_KEY } from "@natsuneko-laboratory/makit-runtime/client";
// Types are erased at compile time, so they can come from the main entry.
import type { ThemeToggleProps } from "@natsuneko-laboratory/makit-runtime";

/**
 * The `ThemeToggle` slot as a client component: `"use client"` plus hooks,
 * which any interactive slot needs. `react` resolves without this project
 * depending on it.
 *
 * The initial theme is read after mount, because the pre-hydration script
 * (the `ThemeScript` slot) is what sets `data-theme` before first paint.
 */
export default function ThemeToggle(_props: ThemeToggleProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable; the theme just will not persist.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-[var(--makit-radius)] border border-[var(--makit-color-border)] px-3 py-1.5 text-xs font-medium text-[var(--makit-color-subtle)] transition hover:border-[var(--makit-color-accent)] hover:text-[var(--makit-color-accent)]"
    >
      {theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}
