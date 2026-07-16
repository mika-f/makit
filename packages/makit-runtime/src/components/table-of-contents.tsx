import type { GeneratedHeading } from "../data/types.js";

export function TableOfContents({
  headings,
  minDepth,
  maxDepth,
}: {
  headings: readonly GeneratedHeading[];
  minDepth: number;
  maxDepth: number;
}) {
  const visible = headings.filter((h) => h.depth >= minDepth && h.depth <= maxDepth && h.id);
  if (visible.length === 0) return null;

  return (
    <nav
      aria-label="Table of contents"
      className="hidden w-56 shrink-0 border-l border-[var(--makit-color-border)] p-4 text-sm lg:block"
    >
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--makit-color-foreground)] opacity-60">
        On this page
      </h2>
      <ul className="space-y-1">
        {visible.map((heading) => (
          <li key={heading.id} style={{ paddingLeft: `${(heading.depth - minDepth) * 0.75}rem` }}>
            <a
              href={`#${heading.id}`}
              className="block text-[var(--makit-color-foreground)] opacity-80 hover:opacity-100 hover:underline"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
