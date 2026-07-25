"use client";

import { useEffect, useMemo, useState } from "react";
import type { TableOfContentsProps } from "@natsuneko-laboratory/makit-runtime";

export function TableOfContents({ headings, minDepth, maxDepth, actions }: TableOfContentsProps) {
  const visible = useMemo(
    () => headings.filter((h) => h.depth >= minDepth && h.depth <= maxDepth && h.id),
    [headings, minDepth, maxDepth],
  );
  const [activeId, setActiveId] = useState<string | undefined>(() => visible[0]?.id);

  useEffect(() => {
    if (visible.length === 0) return;

    let frame = 0;
    const updateActiveHeading = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Matches this theme's `scroll-padding-top`.
        const activationLine = 128;
        let nextId = visible[0]?.id;

        for (const heading of visible) {
          const element = document.getElementById(heading.id);
          if (!element) continue;
          if (element.getBoundingClientRect().top <= activationLine) nextId = heading.id;
          else break;
        }

        setActiveId(nextId);
      });
    };

    updateActiveHeading();
    window.addEventListener("scroll", updateActiveHeading, { passive: true });
    window.addEventListener("hashchange", updateActiveHeading);
    window.addEventListener("resize", updateActiveHeading);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateActiveHeading);
      window.removeEventListener("hashchange", updateActiveHeading);
      window.removeEventListener("resize", updateActiveHeading);
    };
  }, [visible]);

  if (visible.length === 0) return null;

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] overflow-y-auto px-4 py-8 xl:block">
      <div className="makit-product-card rounded-2xl border border-[var(--makit-color-border)] bg-[var(--makit-color-surface)] p-4">
        <h2 className="mb-3 text-[11px] font-semibold tracking-[0.1em] text-[var(--makit-color-subtle)] uppercase">
          On this page
        </h2>
        <nav aria-label="Table of contents">
          <ul className="space-y-1">
            {visible.map((heading) => {
              const isActive = activeId === heading.id;
              return (
                <li
                  key={heading.id}
                  style={{ paddingLeft: `${(heading.depth - minDepth) * 0.75}rem` }}
                >
                  <a
                    href={`#${heading.id}`}
                    aria-current={isActive ? "location" : undefined}
                    className={
                      isActive
                        ? "flex items-center gap-2 rounded-lg bg-[color-mix(in_srgb,var(--makit-color-accent)_12%,transparent)] px-2.5 py-1.5 text-[13px] leading-5 font-medium text-[var(--makit-color-accent)]"
                        : "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] leading-5 text-[var(--makit-color-subtle)] transition hover:bg-[var(--makit-color-muted)] hover:text-[var(--makit-color-foreground)]"
                    }
                  >
                    {heading.text}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        {actions}
      </div>
    </aside>
  );
}
