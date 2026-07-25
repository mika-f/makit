import Link from "next/link";
import type { ReactNode } from "react";
import type {
  GlobalNavigationGroup,
  GlobalNavigationItem,
  HeaderData,
  HeaderProps,
} from "@natsuneko-laboratory/makit-runtime";

const LINK_CLASS =
  "text-[13px] text-[var(--makit-color-subtle)] transition hover:text-[var(--makit-color-accent)]";

function ExternalMark() {
  return (
    <span aria-hidden="true" className="ml-0.5 opacity-60">
      ↗
    </span>
  );
}

function NavLink({ title, href, external }: { title: string; href: string; external?: boolean }) {
  const label = (
    <>
      <span aria-hidden="true" className="text-[var(--makit-color-border-strong)]">
        /
      </span>
      {title}
      {external && <ExternalMark />}
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
      {label}
    </a>
  ) : (
    <Link href={href} className={LINK_CLASS}>
      {label}
    </Link>
  );
}

/** A `navigation.global` item, with children rendered as a JS-free disclosure. */
function GlobalNavItem({ item }: { item: GlobalNavigationItem }) {
  if (item.items && item.items.length > 0) {
    return (
      <details className="relative inline-block">
        <summary className={`${LINK_CLASS} cursor-pointer list-none`}>
          <span aria-hidden="true" className="text-[var(--makit-color-border-strong)]">
            /
          </span>
          {item.title}
          <span aria-hidden="true" className="ml-1 opacity-60">
            ▾
          </span>
        </summary>
        <div className="absolute z-20 mt-2 min-w-48 border border-[var(--makit-color-border)] bg-[var(--makit-color-surface)] p-1">
          {item.items.map((child) => (
            <span key={child.title} className="block px-2 py-1.5">
              <NavLink title={child.title} href={child.href ?? "#"} external={child.external} />
            </span>
          ))}
        </div>
      </details>
    );
  }
  return <NavLink title={item.title} href={item.href ?? "#"} external={item.external} />;
}

function Wordmark({ header, siteTitle }: { header: HeaderData; siteTitle: string }) {
  return (
    <>
      {header.logo ? (
        <>
          <img src={header.logo} alt="" className="makit-header-logo-light h-6 w-6" />
          {header.logoDark ? (
            <img src={header.logoDark} alt="" className="makit-header-logo-dark h-6 w-6" />
          ) : null}
        </>
      ) : (
        <span
          aria-hidden="true"
          className="shrink-0 font-bold text-[var(--makit-color-accent)] select-none"
        >
          $
        </span>
      )}
      <span className="truncate font-semibold">{header.title ?? siteTitle}</span>
      {/* A steady block cursor — decorative, and deliberately not animated. */}
      <span aria-hidden="true" className="text-[var(--makit-color-accent)] opacity-70">
        ▌
      </span>
    </>
  );
}

export function Header({ header, siteTitle, homeHref, actions, globalNavigation }: HeaderProps) {
  const globalItems: GlobalNavigationItem[] = (
    globalNavigation ?? ([] as readonly GlobalNavigationGroup[])
  ).flatMap((group) => group.items);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--makit-color-border)] bg-[var(--makit-color-background)]">
      <div className="mx-auto flex h-14 w-full max-w-[100rem] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-6">
          <Link
            href={homeHref}
            className="flex min-w-0 items-center gap-2 text-[15px] text-[var(--makit-color-foreground)]"
          >
            <Wordmark header={header} siteTitle={siteTitle} />
          </Link>
          <nav className="hidden items-center gap-4 md:flex" aria-label="Global navigation">
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
