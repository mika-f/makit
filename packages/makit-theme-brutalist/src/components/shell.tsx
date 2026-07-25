import Link from "next/link";
import type { ReactNode } from "react";
import type {
  FooterProps,
  GeneratedPageLink,
  GlobalNavigationGroup,
  GlobalNavigationItem,
  HeaderProps,
  NavigationItemsProps,
  PageHeaderProps,
  PrevNextLinksProps,
  ResolvedNavContainerNode,
  ResolvedNavNode,
  SidebarProps,
} from "@natsuneko-laboratory/makit-runtime";

const NAV_LINK =
  "border-2 border-transparent px-3 py-2 text-xs font-black tracking-[0.08em] uppercase transition hover:border-[var(--makit-color-border-strong)] hover:bg-[var(--makit-brutalist-highlight)] hover:text-[#111]";

function HeaderLink({
  title,
  href,
  external,
}: {
  title: string;
  href: string;
  external?: boolean;
}) {
  const body = (
    <>
      {title}
      {external ? " ↗" : ""}
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={NAV_LINK}>
      {body}
    </a>
  ) : (
    <Link href={href} className={NAV_LINK}>
      {body}
    </Link>
  );
}

function GlobalNavItem({ item }: { item: GlobalNavigationItem }) {
  if (item.items?.length) {
    return (
      <details className="relative">
        <summary className={`${NAV_LINK} cursor-pointer list-none`}>{item.title} ↓</summary>
        <div className="makit-brutalist-box absolute right-0 z-20 mt-3 flex min-w-52 flex-col gap-1 border-2 border-[var(--makit-color-border-strong)] bg-[var(--makit-color-surface)] p-2">
          {item.items.map((child) => (
            <HeaderLink
              key={child.title}
              title={child.title}
              href={child.href ?? "#"}
              external={child.external}
            />
          ))}
        </div>
      </details>
    );
  }
  return <HeaderLink title={item.title} href={item.href ?? "#"} external={item.external} />;
}

export function Header({ header, siteTitle, homeHref, actions, globalNavigation }: HeaderProps) {
  const globalItems: GlobalNavigationItem[] = (
    globalNavigation ?? ([] as readonly GlobalNavigationGroup[])
  ).flatMap((group) => group.items);
  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-[var(--makit-color-border-strong)] bg-[var(--makit-color-background)]">
      <div className="mx-auto flex min-h-18 max-w-[94rem] items-stretch justify-between">
        <Link
          href={homeHref}
          className="flex min-w-0 items-center gap-3 border-r-[3px] border-[var(--makit-color-border-strong)] px-4 sm:px-6"
        >
          {header.logo ? (
            <>
              <img src={header.logo} alt="" className="makit-header-logo-light h-8 w-8" />
              {header.logoDark && (
                <img src={header.logoDark} alt="" className="makit-header-logo-dark h-8 w-8" />
              )}
            </>
          ) : (
            <span className="flex size-9 items-center justify-center border-2 border-[#111] bg-[var(--makit-brutalist-highlight)] text-sm font-black text-[#111]">
              M!
            </span>
          )}
          <span className="truncate text-base font-black tracking-[-0.025em] uppercase sm:text-lg">
            {header.title ?? siteTitle}
          </span>
        </Link>
        <div className="flex items-center gap-2 px-3 sm:px-5">
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Global navigation">
            {globalItems.length
              ? globalItems.map((item) => <GlobalNavItem key={item.title} item={item} />)
              : (header.links ?? []).map((link) => (
                  <HeaderLink
                    key={link.href}
                    title={link.label}
                    href={link.href}
                    external={link.external}
                  />
                ))}
          </nav>
          <div className="flex items-center gap-2">{actions as ReactNode}</div>
        </div>
      </div>
    </header>
  );
}

function containsRoute(node: ResolvedNavNode, currentRoute: string): boolean {
  if (node.type === "page") return node.href === currentRoute;
  if (node.type === "link") return false;
  return node.href === currentRoute || node.items.some((item) => containsRoute(item, currentRoute));
}

function ItemLink({
  title,
  href,
  external,
  currentRoute,
}: {
  title: string;
  href: string | undefined;
  external?: boolean;
  currentRoute: string;
}) {
  if (!href) return <span className="block px-3 py-2 text-sm font-bold">{title}</span>;
  const active = href === currentRoute;
  const className = active
    ? "makit-brutalist-nav-active block border-2 border-[var(--makit-color-border-strong)] bg-[var(--makit-color-foreground)] px-3 py-2 text-sm font-black text-[var(--makit-color-background)]"
    : "block border-2 border-transparent px-3 py-2 text-sm font-semibold transition hover:border-[var(--makit-color-border-strong)]";
  const body = (
    <>
      {title}
      {external ? " ↗" : ""}
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {body}
    </a>
  ) : (
    <Link href={href} aria-current={active ? "page" : undefined} className={className}>
      {body}
    </Link>
  );
}

function NavContainer({
  node,
  currentRoute,
  depth,
}: {
  node: ResolvedNavContainerNode;
  currentRoute: string;
  depth: number;
}) {
  const children = node.items.length > 0 && (
    <NavigationItems items={node.items} currentRoute={currentRoute} depth={depth + 1} />
  );
  const label = (
    <span className="text-[11px] font-black tracking-[0.12em] uppercase">{node.title}</span>
  );
  if (!node.collapsible) {
    return (
      <div className="mt-7">
        {node.title && (
          <div className="mb-2 border-b-2 border-[var(--makit-color-border-strong)] px-3 pb-2">
            {label}
          </div>
        )}
        {children}
      </div>
    );
  }
  return (
    <details className="mt-7" open={!node.collapsed || containsRoute(node, currentRoute)}>
      <summary className="mb-2 flex cursor-pointer list-none items-center justify-between border-b-2 border-[var(--makit-color-border-strong)] px-3 pb-2">
        {label}
        <span className="makit-brutalist-marker font-black">+</span>
      </summary>
      {children}
    </details>
  );
}

export function NavigationItems({ items, currentRoute, depth = 0 }: NavigationItemsProps) {
  return (
    <ul className={depth ? "ml-3 border-l-2 border-[var(--makit-color-border)] pl-2" : "space-y-1"}>
      {items.map((node, index) => (
        <li key={node.type === "page" ? node.pageId : `${node.type}-${node.title ?? index}`}>
          {node.type === "page" && (
            <ItemLink title={node.title} href={node.href} currentRoute={currentRoute} />
          )}
          {node.type === "link" && (
            <ItemLink
              title={node.title}
              href={node.href}
              external={node.external}
              currentRoute={currentRoute}
            />
          )}
          {(node.type === "section" || node.type === "group") && (
            <NavContainer node={node} currentRoute={currentRoute} depth={depth} />
          )}
        </li>
      ))}
    </ul>
  );
}

export function Sidebar({ navigation, currentRoute, components }: SidebarProps) {
  if (!navigation.length) return null;
  const Navigation = components?.NavigationItems ?? NavigationItems;
  return (
    <>
      <aside className="sticky top-18 hidden h-[calc(100vh-4.5rem)] overflow-y-auto border-r-[3px] border-[var(--makit-color-border-strong)] px-4 py-8 md:block">
        <nav aria-label="Documentation navigation">
          <Navigation items={navigation} currentRoute={currentRoute} />
        </nav>
      </aside>
      <details className="border-b-[3px] border-[var(--makit-color-border-strong)] p-4 md:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-black tracking-[0.12em] uppercase">
          Menu <span className="makit-brutalist-marker text-lg">+</span>
        </summary>
        <nav className="mt-4" aria-label="Documentation navigation">
          <Navigation items={navigation} currentRoute={currentRoute} />
        </nav>
      </details>
    </>
  );
}

export function PageHeader({ page }: PageHeaderProps) {
  const section = page.hierarchy.at(-1)?.title;
  return (
    <header className="mb-10">
      <div className="mb-5 flex items-center gap-3">
        <span className="h-3 w-10 bg-[var(--makit-brutalist-highlight)] outline-2 outline-[#111]" />
        <span className="text-xs font-black tracking-[0.14em] uppercase">
          {section ?? "Documentation"}
        </span>
      </div>
      <h1 className="max-w-4xl text-4xl leading-[0.95] font-black tracking-[-0.055em] uppercase sm:text-6xl">
        {page.title}
      </h1>
      {page.description && (
        <p className="mt-6 max-w-2xl border-l-[6px] border-[var(--makit-brutalist-highlight)] pl-4 text-lg leading-7 font-semibold">
          {page.description}
        </p>
      )}
    </header>
  );
}

function PageLink({ link, direction }: { link: GeneratedPageLink; direction: "prev" | "next" }) {
  const previous = direction === "prev";
  return (
    <Link
      href={link.href}
      className={`makit-brutalist-box group border-2 border-[var(--makit-color-border-strong)] bg-[var(--makit-color-surface)] p-5 transition hover:-translate-x-0.5 hover:-translate-y-0.5 ${previous ? "" : "text-right"}`}
    >
      <span className="block text-[10px] font-black tracking-[0.14em] uppercase">
        {previous ? "← Previous" : "Next →"}
      </span>
      <span className="mt-2 block text-lg font-black uppercase group-hover:text-[var(--makit-color-accent)]">
        {link.title}
      </span>
    </Link>
  );
}

export function PrevNextLinks({ prev, next }: PrevNextLinksProps) {
  if (!prev && !next) return null;
  return (
    <nav className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2">
      {prev ? <PageLink link={prev} direction="prev" /> : <span />}
      {next ? <PageLink link={next} direction="next" /> : <span />}
    </nav>
  );
}

export function Footer({ footer }: FooterProps) {
  if (!footer.copyright && !footer.links?.length) return null;
  return (
    <footer className="border-t-[3px] border-[var(--makit-color-border-strong)] bg-[var(--makit-color-foreground)] px-6 py-8 text-xs font-bold text-[var(--makit-color-background)]">
      <div className="mx-auto flex max-w-[94rem] flex-wrap justify-between gap-4">
        {footer.copyright && <span className="uppercase">{footer.copyright}</span>}
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
