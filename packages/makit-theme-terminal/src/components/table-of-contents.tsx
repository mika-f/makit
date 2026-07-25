"use client";

import { useEffect, useMemo, useState } from "react";
import type { TableOfContentsProps } from "@natsuneko-laboratory/makit-runtime";

/** `#`, `##`, `###`… by heading depth, mirroring the Markdown that produced it. */
function depthMarker(depth: number): string {
  return "#".repeat(Math.max(1, Math.min(depth, 6)));
}

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
        // Matches `scroll-padding-top` plus this theme's shorter header.
        const activationLine = 96;
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
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] overflow-y-auto border-l border-[var(--makit-color-border)] px-4 py-6 text-[13px] xl:block">
      <h2 className="mb-3 text-[10px] tracking-[0.2em] text-[var(--makit-color-subtle)] uppercase">
        <span aria-hidden="true" className="text-[var(--makit-color-accent)]">
          —{" "}
        </span>
        contents
      </h2>
      <nav aria-label="Table of contents">
        <ul className="space-y-1.5">
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
                      ? "flex gap-1.5 leading-5 font-medium text-[var(--makit-color-accent)]"
                      : "flex gap-1.5 leading-5 text-[var(--makit-color-subtle)] transition hover:text-[var(--makit-color-foreground)]"
                  }
                >
                  <span aria-hidden="true" className="shrink-0 opacity-50 select-none">
                    {depthMarker(heading.depth)}
                  </span>
                  <span>{heading.text}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      {actions}
    </aside>
  );
}
