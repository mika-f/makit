import type { ReactNode } from "react";
import type { HeaderData } from "../data/types.js";

export function Header({
  header,
  siteTitle,
  homeHref,
  actions,
}: {
  header: HeaderData;
  siteTitle: string;
  homeHref: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between border-b border-[var(--makit-color-border)] px-4 py-3">
      <a
        href={homeHref}
        className="flex items-center gap-2 font-semibold text-[var(--makit-color-foreground)]"
      >
        {header.logo && <img src={header.logo} alt="" className="h-6 w-6" />}
        <span>{header.title ?? siteTitle}</span>
      </a>
      <div className="flex items-center gap-3">
        <nav className="hidden items-center gap-3 sm:flex" aria-label="Header links">
          {(header.links ?? []).map((link) => (
            <a
              key={link.href}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="text-sm text-[var(--makit-color-foreground)] opacity-80 hover:opacity-100"
            >
              {link.label}
            </a>
          ))}
        </nav>
        {actions}
      </div>
    </header>
  );
}
