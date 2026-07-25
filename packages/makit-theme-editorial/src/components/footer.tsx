import Link from "next/link";
import type { FooterProps } from "@natsuneko-laboratory/makit-runtime";

export function Footer({ footer }: FooterProps) {
  if (!footer.copyright && !footer.links?.length) return null;
  return (
    <footer className="border-t border-[var(--makit-color-border-strong)] px-6 py-8 text-xs text-[var(--makit-color-subtle)]">
      <div className="mx-auto flex max-w-[88rem] flex-wrap justify-between gap-4">
        {footer.copyright && <span>{footer.copyright}</span>}
        <nav className="flex gap-5" aria-label="Footer links">
          {(footer.links ?? []).map((link) =>
            link.external ? (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
                {link.label} ↗
              </a>
            ) : (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ),
          )}
        </nav>
      </div>
    </footer>
  );
}
