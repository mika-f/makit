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
    <aside className="sticky top-18 hidden h-[calc(100vh-4.5rem)] overflow-y-auto border-l border-[var(--makit-color-border)] py-10 pl-7 xl:block">
      <p className="mb-4 text-[10px] font-bold tracking-[0.18em] text-[var(--makit-color-subtle)] uppercase">
        In this article
      </p>
      <nav aria-label="Table of contents">
        <ul>
          {visible.map((heading) => (
            <li key={heading.id} style={{ paddingLeft: `${(heading.depth - minDepth) * 0.75}rem` }}>
              <a
                href={`#${heading.id}`}
                aria-current={activeId === heading.id ? "location" : undefined}
                className={
                  activeId === heading.id
                    ? "block border-l border-[var(--makit-color-accent)] py-1.5 pl-3 text-xs leading-5 font-semibold text-[var(--makit-color-accent)]"
                    : "block border-l border-transparent py-1.5 pl-3 text-xs leading-5 text-[var(--makit-color-subtle)] hover:text-[var(--makit-color-foreground)]"
                }
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-7 border-t border-[var(--makit-color-border)] pt-5">{actions}</div>
    </aside>
  );
}
