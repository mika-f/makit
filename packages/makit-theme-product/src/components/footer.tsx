import Link from "next/link";
import type { FooterProps } from "@natsuneko-laboratory/makit-runtime";
import { ExternalArrow } from "./icons.js";

export function Footer({ footer }: FooterProps) {
  if (!footer.copyright && (!footer.links || footer.links.length === 0)) return null;

  return (
    <footer className="border-t border-[var(--makit-color-border)] bg-[var(--makit-color-muted)] px-6 py-10 text-sm text-[var(--makit-color-subtle)]">
      <div className="mx-auto flex max-w-[92rem] flex-wrap items-center justify-between gap-4">
        {footer.copyright && <span>{footer.copyright}</span>}
        <nav className="flex flex-wrap items-center gap-5" aria-label="Footer links">
          {(footer.links ?? []).map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 transition hover:text-[var(--makit-color-foreground)]"
              >
                {link.label}
                <ExternalArrow className="size-3 opacity-60" />
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="transition hover:text-[var(--makit-color-foreground)]"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>
      </div>
    </footer>
  );
}
