"use client";

import { useEffect, useMemo, useState } from "react";
import type { TableOfContentsProps } from "@natsuneko-laboratory/makit-runtime";

export function TableOfContents({ headings, minDepth, maxDepth, actions }: TableOfContentsProps) {
  const visible = useMemo(
    () =>
      headings.filter(
        (heading) => heading.depth >= minDepth && heading.depth <= maxDepth && heading.id,
      ),
    [headings, minDepth, maxDepth],
  );
  const [activeId, setActiveId] = useState<string | undefined>(visible[0]?.id);

  useEffect(() => {
    if (!visible.length) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let next = visible[0]?.id;
        for (const heading of visible) {
          const element = document.getElementById(heading.id);
          if (!element) continue;
          if (element.getBoundingClientRect().top <= 128) next = heading.id;
          else break;
        }
        setActiveId(next);
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("hashchange", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("hashchange", update);
    };
  }, [visible]);

  if (!visible.length) return null;
  return (
    <aside className="sticky top-18 hidden h-[calc(100vh-4.5rem)] overflow-y-auto border-l-[3px] border-[var(--makit-color-border-strong)] px-5 py-8 xl:block">
      <div className="makit-brutalist-box border-2 border-[var(--makit-color-border-strong)] bg-[var(--makit-color-surface)]">
        <div className="border-b-2 border-[var(--makit-color-border-strong)] bg-[var(--makit-brutalist-highlight)] px-4 py-3 text-[10px] font-black tracking-[0.14em] text-[#111] uppercase">
          On this page / {String(visible.length).padStart(2, "0")}
        </div>
        <nav className="p-3" aria-label="Table of contents">
          <ul className="space-y-1">
            {visible.map((heading) => (
              <li
                key={heading.id}
                style={{ paddingLeft: `${(heading.depth - minDepth) * 0.75}rem` }}
              >
                <a
                  href={`#${heading.id}`}
                  aria-current={activeId === heading.id ? "location" : undefined}
                  className={
                    activeId === heading.id
                      ? "block bg-[var(--makit-color-foreground)] px-2 py-1.5 text-xs font-black text-[var(--makit-color-background)]"
                      : "block px-2 py-1.5 text-xs font-semibold hover:bg-[var(--makit-color-muted)]"
                  }
                >
                  {heading.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t-2 border-[var(--makit-color-border-strong)] p-3">{actions}</div>
      </div>
    </aside>
  );
}
