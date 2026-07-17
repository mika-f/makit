"use client";

import { useEffect, useMemo, useState } from "react";
import type { GeneratedHeading } from "../data/types.js";
import { PageActions } from "./page-actions.js";

export function TableOfContents({
  headings,
  minDepth,
  maxDepth,
  route,
  editUrl,
  markdownEnabled,
}: {
  headings: readonly GeneratedHeading[];
  minDepth: number;
  maxDepth: number;
  route: string;
  editUrl?: string;
  markdownEnabled: boolean;
}) {
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
        const activationLine = 112;
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
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] overflow-y-auto px-5 py-10 text-sm xl:block">
      <h2 className="mb-4 text-xs font-semibold text-[var(--makit-color-foreground)]">
        On this page
      </h2>
      <nav aria-label="Table of contents">
        <ul className="space-y-2.5 border-l border-[var(--makit-color-border)]">
          {visible.map((heading) => (
            <li key={heading.id} style={{ paddingLeft: `${(heading.depth - minDepth) * 0.75}rem` }}>
              <a
                href={`#${heading.id}`}
                aria-current={activeId === heading.id ? "location" : undefined}
                className={
                  activeId === heading.id
                    ? "-ml-px block border-l border-[var(--makit-color-accent)] pl-4 font-medium leading-5 text-[var(--makit-color-accent)]"
                    : "-ml-px block border-l border-transparent pl-4 leading-5 text-[var(--makit-color-subtle)] transition hover:border-[var(--makit-color-border-strong)] hover:text-[var(--makit-color-foreground)]"
                }
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <PageActions
        route={route}
        editUrl={editUrl}
        markdownEnabled={markdownEnabled}
        placement="table-of-contents"
      />
    </aside>
  );
}
