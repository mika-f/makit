import Link from "next/link";
import type { FooterProps } from "@natsuneko-laboratory/makit-runtime";

export function Footer({ footer }: FooterProps) {
  if (!footer.copyright && (!footer.links || footer.links.length === 0)) return null;

  return (
    <footer className="border-t border-[var(--makit-color-border)] px-4 py-5 text-xs text-[var(--makit-color-subtle)] sm:px-6">
      <div className="mx-auto flex max-w-[100rem] flex-wrap items-center justify-between gap-3">
        {footer.copyright && (
          <span>
            <span aria-hidden="true" className="mr-1.5 opacity-60">
              #
            </span>
            {footer.copyright}
          </span>
        )}
        <nav className="flex flex-wrap items-center gap-3" aria-label="Footer links">
          {(footer.links ?? []).map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-[var(--makit-color-accent)]"
              >
                {link.label}
                <span aria-hidden="true" className="ml-0.5 opacity-60">
                  ↗
                </span>
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="transition hover:text-[var(--makit-color-accent)]"
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
