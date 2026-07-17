import Link from "next/link";
import type { GeneratedPageLink } from "../data/types.js";

export interface PrevNextLinksProps {
  prev?: GeneratedPageLink;
  next?: GeneratedPageLink;
}

/** Renders the page's precomputed prev/next links (`GeneratedPage.navigationPosition`, spec §30, §32). */
export function PrevNextLinks({ prev, next }: PrevNextLinksProps) {
  if (!prev && !next) return null;

  return (
    <nav className="mt-14 grid grid-cols-2 gap-4 border-t border-[var(--makit-color-border)] pt-8">
      {prev ? (
        <Link
          href={prev.href}
          className="group rounded-xl border border-[var(--makit-color-border)] px-4 py-3 text-sm transition hover:border-[var(--makit-color-border-strong)] hover:bg-[var(--makit-color-muted)]"
        >
          <span className="mb-1 block text-xs text-[var(--makit-color-subtle)]">← Previous</span>
          <span className="font-medium">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={next.href}
          className="group rounded-xl border border-[var(--makit-color-border)] px-4 py-3 text-right text-sm transition hover:border-[var(--makit-color-border-strong)] hover:bg-[var(--makit-color-muted)]"
        >
          <span className="mb-1 block text-xs text-[var(--makit-color-subtle)]">Next →</span>
          <span className="font-medium">{next.title}</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
