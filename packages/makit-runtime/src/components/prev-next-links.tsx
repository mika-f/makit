import type { PrevNext } from "../navigation/flatten.js";

export function PrevNextLinks({ prev, next }: PrevNext) {
  if (!prev && !next) return null;

  return (
    <nav className="mt-10 flex items-center justify-between gap-4 border-t border-[var(--makit-color-border)] pt-6">
      {prev ? (
        <a
          href={prev.href}
          className="rounded-[var(--makit-radius)] border border-[var(--makit-color-border)] px-4 py-2 text-sm hover:bg-[var(--makit-color-muted)]"
        >
          <span className="block text-xs opacity-60">Previous</span>
          {prev.title}
        </a>
      ) : (
        <span />
      )}
      {next ? (
        <a
          href={next.href}
          className="rounded-[var(--makit-radius)] border border-[var(--makit-color-border)] px-4 py-2 text-right text-sm hover:bg-[var(--makit-color-muted)]"
        >
          <span className="block text-xs opacity-60">Next</span>
          {next.title}
        </a>
      ) : (
        <span />
      )}
    </nav>
  );
}
