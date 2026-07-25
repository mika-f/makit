import Link from "next/link";
import type { GeneratedPageLink, PrevNextLinksProps } from "@natsuneko-laboratory/makit-runtime";

function LinkItem({ link, direction }: { link: GeneratedPageLink; direction: "prev" | "next" }) {
  const isPrev = direction === "prev";
  return (
    <Link
      href={link.href}
      className={`group border-t border-[var(--makit-color-border-strong)] py-5 ${isPrev ? "" : "text-right"}`}
    >
      <span className="block text-[10px] font-bold tracking-[0.18em] text-[var(--makit-color-subtle)] uppercase">
        {isPrev ? "← Previous" : "Next →"}
      </span>
      <span className="makit-editorial-display mt-2 block text-lg font-semibold group-hover:text-[var(--makit-color-accent)]">
        {link.title}
      </span>
    </Link>
  );
}

export function PrevNextLinks({ prev, next }: PrevNextLinksProps) {
  if (!prev && !next) return null;
  return (
    <nav className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2">
      {prev ? <LinkItem link={prev} direction="prev" /> : <span />}
      {next ? <LinkItem link={next} direction="next" /> : <span />}
    </nav>
  );
}
