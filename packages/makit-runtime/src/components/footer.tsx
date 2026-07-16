import type { FooterData } from "../data/types.js";

export function Footer({ footer }: { footer: FooterData }) {
  if (!footer.copyright && (!footer.links || footer.links.length === 0)) return null;

  return (
    <footer className="border-t border-[var(--makit-color-border)] px-4 py-6 text-sm text-[var(--makit-color-foreground)] opacity-70">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {footer.copyright && <span>{footer.copyright}</span>}
        <nav className="flex gap-4" aria-label="Footer links">
          {(footer.links ?? []).map((link) => (
            <a
              key={link.href}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="hover:underline"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
