"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Adds a copy button to every Shiki code block within its children (spec §19.3 `code.copyButton`). */
export function CodeCopyEnhancer({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !ref.current) return;

    const blocks = ref.current.querySelectorAll<HTMLPreElement>("pre.shiki");
    const cleanups: (() => void)[] = [];

    for (const pre of blocks) {
      if (pre.querySelector(".makit-copy-button")) continue;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "makit-copy-button";
      button.textContent = "Copy";
      button.setAttribute("aria-label", "Copy code to clipboard");

      const onClick = () => {
        const code = pre.querySelector("code")?.textContent ?? "";
        navigator.clipboard
          ?.writeText(code)
          .then(() => {
            button.textContent = "Copied!";
            setTimeout(() => {
              button.textContent = "Copy";
            }, 1500);
          })
          .catch(() => {
            // Clipboard access denied/unsupported — the button silently does nothing.
          });
      };

      button.addEventListener("click", onClick);
      pre.appendChild(button);
      cleanups.push(() => button.removeEventListener("click", onClick));
    }

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [enabled]);

  return <div ref={ref}>{children}</div>;
}
