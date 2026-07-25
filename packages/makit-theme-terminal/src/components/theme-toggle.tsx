"use client";

import { useEffect, useState } from "react";
// Values used by a Client Component come from the `/client` subpath, which is
// free of the filesystem-backed data loaders (THEME §11).
import { THEME_STORAGE_KEY } from "@natsuneko-laboratory/makit-runtime/client";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | undefined>(undefined);

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
      // Storage unavailable (private browsing) — the choice just won't persist.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle color theme"
      className="flex h-8 w-[4.25rem] items-center justify-center border border-[var(--makit-color-border)] text-xs text-[var(--makit-color-subtle)] transition hover:border-[var(--makit-color-accent)] hover:text-[var(--makit-color-accent)]"
    >
      {/* The scheme is unknown until the effect runs; the fixed width keeps the
          button from resizing between the server render and hydration. */}
      {theme === undefined ? "" : theme === "dark" ? "[dark]" : "[light]"}
    </button>
  );
}
