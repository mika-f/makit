import { ExternalLink } from "lucide-react";
import type { FooterData } from "../data/types.js";
import { RouteLink } from "./route-link.js";

export interface FooterProps {
  footer: FooterData;
}

export function Footer({ footer }: FooterProps) {
  if (!footer.copyright && (!footer.links || footer.links.length === 0)) return null;

  return (
    <footer className="border-t border-[var(--makit-color-border)] px-6 py-7 text-sm text-[var(--makit-color-subtle)]">
      <div className="mx-auto flex max-w-[96rem] flex-wrap items-center justify-between gap-3">
        {footer.copyright && <span>{footer.copyright}</span>}
        <nav className="flex gap-4" aria-label="Footer links">
          {(footer.links ?? []).map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-[var(--makit-color-foreground)]"
              >
                {link.label}
                <ExternalLink aria-hidden="true" className="ml-1 inline size-3.5" />
              </a>
            ) : (
              <RouteLink
                key={link.href}
                href={link.href}
                className="transition hover:text-[var(--makit-color-foreground)]"
              >
                {link.label}
              </RouteLink>
            ),
          )}
        </nav>
      </div>
    </footer>
  );
}
