import Link from "next/link";
import type { GeneratedPageLink, PrevNextLinksProps } from "@natsuneko-laboratory/makit-runtime";
import { ArrowRight } from "./icons.js";

function Card({ link, direction }: { link: GeneratedPageLink; direction: "prev" | "next" }) {
  const isPrev = direction === "prev";
  return (
    <Link
      href={link.href}
      className={`group flex flex-col gap-1.5 rounded-2xl border border-[var(--makit-color-border)] bg-[var(--makit-color-surface)] px-5 py-4 transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--makit-color-accent)_45%,var(--makit-color-border))] hover:shadow-lg ${
        isPrev ? "" : "items-end text-right"
      }`}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--makit-color-subtle)]">
        {isPrev && <ArrowRight className="size-3.5 rotate-180" />}
        {isPrev ? "Previous" : "Next"}
        {!isPrev && <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />}
      </span>
      <span className="font-medium text-[var(--makit-color-foreground)] group-hover:text-[var(--makit-color-accent)]">
        {link.title}
      </span>
    </Link>
  );
}

export function PrevNextLinks({ prev, next }: PrevNextLinksProps) {
  if (!prev && !next) return null;

  return (
    <nav className="mt-16 grid grid-cols-1 gap-4 border-t border-[var(--makit-color-border)] pt-10 sm:grid-cols-2">
      {prev ? <Card link={prev} direction="prev" /> : <span className="hidden sm:block" />}
      {next ? <Card link={next} direction="next" /> : <span className="hidden sm:block" />}
    </nav>
  );
}
