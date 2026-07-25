import Link from "next/link";
import type { GeneratedPageLink, PrevNextLinksProps } from "@natsuneko-laboratory/makit-runtime";

const BOX =
  "group flex flex-col gap-1 border border-[var(--makit-color-border)] px-4 py-3 text-[13px] transition hover:border-[var(--makit-color-accent)] hover:bg-[color-mix(in_srgb,var(--makit-color-accent)_6%,transparent)]";

function Box({ link, direction }: { link: GeneratedPageLink; direction: "prev" | "next" }) {
  const isPrev = direction === "prev";
  return (
    <Link href={link.href} className={`${BOX} ${isPrev ? "" : "text-right"}`}>
      <span className="text-[11px] tracking-[0.14em] text-[var(--makit-color-subtle)] uppercase">
        {isPrev ? "← prev" : "next →"}
      </span>
      <span className="truncate text-[var(--makit-color-foreground)] group-hover:text-[var(--makit-color-accent)]">
        {link.title}
      </span>
    </Link>
  );
}

export function PrevNextLinks({ prev, next }: PrevNextLinksProps) {
  if (!prev && !next) return null;

  return (
    <nav className="mt-12 grid grid-cols-1 gap-3 border-t border-dashed border-[var(--makit-color-border)] pt-8 sm:grid-cols-2">
      {prev ? <Box link={prev} direction="prev" /> : <span className="hidden sm:block" />}
      {next ? <Box link={next} direction="next" /> : <span className="hidden sm:block" />}
    </nav>
  );
}
