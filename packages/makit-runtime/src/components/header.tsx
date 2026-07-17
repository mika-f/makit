import type { ReactNode } from "react";
import type { GlobalNavigationGroup, GlobalNavigationItem, HeaderData } from "../data/types.js";

function GlobalNavItem({ item }: { item: GlobalNavigationItem }) {
  if (item.items && item.items.length > 0) {
    return (
      <details className="relative inline-block">
        <summary className="cursor-pointer list-none text-sm text-[var(--makit-color-foreground)] opacity-80 hover:opacity-100">
          {item.title}
        </summary>
        <div className="absolute z-10 mt-1 min-w-40 rounded-[var(--makit-radius)] border border-[var(--makit-color-border)] bg-[var(--makit-color-background)] p-2 shadow-lg">
          {item.items.map((child) => (
            <a
              key={child.title}
              href={child.href ?? "#"}
              target={child.external ? "_blank" : undefined}
              rel={child.external ? "noopener noreferrer" : undefined}
              className="block rounded-[var(--makit-radius)] px-2 py-1 text-sm text-[var(--makit-color-foreground)] hover:bg-[var(--makit-color-muted)]"
            >
              {child.title}
            </a>
          ))}
        </div>
      </details>
    );
  }
  return (
    <a
      href={item.href ?? "#"}
      target={item.external ? "_blank" : undefined}
      rel={item.external ? "noopener noreferrer" : undefined}
      className="text-sm text-[var(--makit-color-foreground)] opacity-80 hover:opacity-100"
    >
      {item.title}
    </a>
  );
}

/** `navigation.global` (spec §26), resolved per locale with `collection` refs turned into hrefs. */
function GlobalNav({ groups }: { groups: readonly GlobalNavigationGroup[] }) {
  const items = groups.flatMap((group) => group.items);
  if (items.length === 0) return null;
  return (
    <nav className="hidden items-center gap-4 sm:flex" aria-label="Global navigation">
      {items.map((item) => (
        <GlobalNavItem key={item.title} item={item} />
      ))}
    </nav>
  );
}

export function Header({
  header,
  siteTitle,
  homeHref,
  actions,
  globalNavigation,
}: {
  header: HeaderData;
  siteTitle: string;
  homeHref: string;
  actions?: ReactNode;
  /** Takes over from `header.links` when provided and non-empty (spec §26). */
  globalNavigation?: readonly GlobalNavigationGroup[];
}) {
  const hasGlobalNav = (globalNavigation?.flatMap((group) => group.items).length ?? 0) > 0;

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
        {hasGlobalNav ? (
          <GlobalNav groups={globalNavigation!} />
        ) : (
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
        )}
        {actions}
      </div>
    </header>
  );
}
