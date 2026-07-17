import type { ReactNode } from "react";
import type { GlobalNavigationGroup, GlobalNavigationItem, HeaderData } from "../data/types.js";

function GlobalNavItem({ item }: { item: GlobalNavigationItem }) {
  if (item.items && item.items.length > 0) {
    return (
      <details className="relative inline-block">
        <summary className="cursor-pointer list-none text-sm text-[var(--makit-color-subtle)] transition hover:text-[var(--makit-color-foreground)]">
          {item.title}
        </summary>
        <div className="absolute z-20 mt-2 min-w-44 rounded-xl border border-[var(--makit-color-border)] bg-[var(--makit-color-surface)] p-1.5 shadow-xl">
          {item.items.map((child) => (
            <a
              key={child.title}
              href={child.href ?? "#"}
              target={child.external ? "_blank" : undefined}
              rel={child.external ? "noopener noreferrer" : undefined}
              className="block rounded-lg px-2.5 py-2 text-sm text-[var(--makit-color-subtle)] transition hover:bg-[var(--makit-color-muted)] hover:text-[var(--makit-color-foreground)]"
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
      className="text-sm text-[var(--makit-color-subtle)] transition hover:text-[var(--makit-color-foreground)]"
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
    <nav className="hidden items-center gap-5 md:flex" aria-label="Global navigation">
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
    <header className="sticky top-0 z-40 border-b border-[var(--makit-color-border)] bg-[color-mix(in_srgb,var(--makit-color-background)_88%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[96rem] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-7">
          <a
            href={homeHref}
            className="flex min-w-0 items-center gap-2.5 font-semibold tracking-[-0.02em] text-[var(--makit-color-foreground)]"
          >
            {header.logo ? (
              <img src={header.logo} alt="" className="h-7 w-7 rounded-md" />
            ) : (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--makit-color-foreground)] text-xs font-bold text-[var(--makit-color-background)]">
                {(header.title ?? siteTitle).slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="truncate">{header.title ?? siteTitle}</span>
          </a>
          {hasGlobalNav ? (
            <GlobalNav groups={globalNavigation!} />
          ) : (
            <nav className="hidden items-center gap-5 md:flex" aria-label="Header links">
              {(header.links ?? []).map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  className="text-sm text-[var(--makit-color-subtle)] transition hover:text-[var(--makit-color-foreground)]"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
        </div>
      </div>
    </header>
  );
}
