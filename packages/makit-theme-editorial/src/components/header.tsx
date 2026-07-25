import Link from "next/link";
import type { ReactNode } from "react";
import type {
  GlobalNavigationGroup,
  GlobalNavigationItem,
  HeaderProps,
} from "@natsuneko-laboratory/makit-runtime";

function NavLink({ title, href, external }: { title: string; href: string; external?: boolean }) {
  const className =
    "text-xs font-semibold tracking-[0.12em] text-[var(--makit-color-subtle)] uppercase transition hover:text-[var(--makit-color-accent)]";
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {title} ↗
    </a>
  ) : (
    <Link href={href} className={className}>
      {title}
    </Link>
  );
}

function GlobalNavItem({ item }: { item: GlobalNavigationItem }) {
  if (item.items?.length) {
    return (
      <details className="relative">
        <summary className="cursor-pointer list-none text-xs font-semibold tracking-[0.12em] text-[var(--makit-color-subtle)] uppercase">
          {item.title} +
        </summary>
        <div className="absolute right-0 z-20 mt-3 min-w-48 border border-[var(--makit-color-border-strong)] bg-[var(--makit-color-surface)] p-4 shadow-lg">
          <div className="flex flex-col gap-3">
            {item.items.map((child) => (
              <NavLink
                key={child.title}
                title={child.title}
                href={child.href ?? "#"}
                external={child.external}
              />
            ))}
          </div>
        </div>
      </details>
    );
  }
  return <NavLink title={item.title} href={item.href ?? "#"} external={item.external} />;
}

export function Header({ header, siteTitle, homeHref, actions, globalNavigation }: HeaderProps) {
  const globalItems: GlobalNavigationItem[] = (
    globalNavigation ?? ([] as readonly GlobalNavigationGroup[])
  ).flatMap((group) => group.items);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--makit-color-border-strong)] bg-[color-mix(in_srgb,var(--makit-color-background)_94%,transparent)] backdrop-blur">
      <div className="mx-auto flex h-18 max-w-[88rem] items-center justify-between gap-6 px-5 sm:px-8">
        <Link href={homeHref} className="flex min-w-0 items-center gap-3">
          {header.logo ? (
            <>
              <img src={header.logo} alt="" className="makit-header-logo-light h-8 w-8" />
              {header.logoDark && (
                <img src={header.logoDark} alt="" className="makit-header-logo-dark h-8 w-8" />
              )}
            </>
          ) : (
            <span className="text-xl text-[var(--makit-color-accent)]">¶</span>
          )}
          <span className="makit-editorial-display truncate text-xl font-semibold">
            {header.title ?? siteTitle}
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <nav className="hidden items-center gap-6 lg:flex" aria-label="Global navigation">
            {globalItems.length
              ? globalItems.map((item) => <GlobalNavItem key={item.title} item={item} />)
              : (header.links ?? []).map((link) => (
                  <NavLink
                    key={link.href}
                    title={link.label}
                    href={link.href}
                    external={link.external}
                  />
                ))}
          </nav>
          <div className="flex items-center gap-2 border-l border-[var(--makit-color-border)] pl-4">
            {actions as ReactNode}
          </div>
        </div>
      </div>
    </header>
  );
}
