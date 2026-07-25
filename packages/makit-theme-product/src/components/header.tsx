import Link from "next/link";
import type { ReactNode } from "react";
import type {
  GlobalNavigationGroup,
  GlobalNavigationItem,
  HeaderData,
  HeaderProps,
} from "@natsuneko-laboratory/makit-runtime";
import { ChevronDown, ExternalArrow } from "./icons.js";

const PILL =
  "flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-[var(--makit-color-subtle)] transition hover:bg-[var(--makit-color-muted)] hover:text-[var(--makit-color-foreground)]";

function NavLink({ title, href, external }: { title: string; href: string; external?: boolean }) {
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={PILL}>
      {title}
      <ExternalArrow className="size-3 opacity-60" />
    </a>
  ) : (
    <Link href={href} className={PILL}>
      {title}
    </Link>
  );
}

/** A `navigation.global` item, with children rendered as a JS-free disclosure. */
function GlobalNavItem({ item }: { item: GlobalNavigationItem }) {
  if (item.items && item.items.length > 0) {
    return (
      <details className="relative inline-block">
        <summary className={`${PILL} cursor-pointer list-none`}>
          {item.title}
          <ChevronDown className="size-3.5 opacity-60" />
        </summary>
        <div className="makit-product-card absolute z-20 mt-2 min-w-52 rounded-2xl border border-[var(--makit-color-border)] bg-[var(--makit-color-surface)] p-1.5">
          {item.items.map((child) => (
            <span key={child.title} className="block">
              <NavLink title={child.title} href={child.href ?? "#"} external={child.external} />
            </span>
          ))}
        </div>
      </details>
    );
  }
  return <NavLink title={item.title} href={item.href ?? "#"} external={item.external} />;
}

function LogoMark({ header, siteTitle }: { header: HeaderData; siteTitle: string }) {
  if (header.logo) {
    return (
      <>
        <img src={header.logo} alt="" className="makit-header-logo-light h-7 w-7 rounded-lg" />
        {header.logoDark ? (
          <img src={header.logoDark} alt="" className="makit-header-logo-dark h-7 w-7 rounded-lg" />
        ) : null}
      </>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-[var(--makit-color-accent)] to-[color-mix(in_srgb,var(--makit-color-accent)_55%,#000)] text-[13px] font-bold text-white"
    >
      {(header.title ?? siteTitle).slice(0, 1).toUpperCase()}
    </span>
  );
}

export function Header({ header, siteTitle, homeHref, actions, globalNavigation }: HeaderProps) {
  const globalItems: GlobalNavigationItem[] = (
    globalNavigation ?? ([] as readonly GlobalNavigationGroup[])
  ).flatMap((group) => group.items);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--makit-color-border)] bg-[color-mix(in_srgb,var(--makit-color-background)_82%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[92rem] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-6">
          <Link
            href={homeHref}
            className="flex min-w-0 items-center gap-2.5 text-[15px] font-semibold tracking-[-0.01em] text-[var(--makit-color-foreground)]"
          >
            <LogoMark header={header} siteTitle={siteTitle} />
            <span className="truncate">{header.title ?? siteTitle}</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Global navigation">
            {globalItems.length > 0
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
        </div>
        <div className="flex shrink-0 items-center gap-2">{actions as ReactNode}</div>
      </div>
    </header>
  );
}
