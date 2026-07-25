import Link from "next/link";
import type {
  NavigationItemsProps,
  ResolvedNavContainerNode,
  ResolvedNavNode,
} from "@natsuneko-laboratory/makit-runtime";

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
  if (!href) return <span className="block py-1.5 text-sm">{title}</span>;
  const isActive = href === currentRoute;
  const className = isActive
    ? "relative block border-l-2 border-[var(--makit-color-accent)] py-1.5 pr-2 pl-4 text-sm font-semibold text-[var(--makit-color-foreground)]"
    : "block border-l-2 border-transparent py-1.5 pr-2 pl-4 text-sm text-[var(--makit-color-subtle)] transition hover:border-[var(--makit-color-border-strong)] hover:text-[var(--makit-color-foreground)]";
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
    <Link href={href} aria-current={isActive ? "page" : undefined} className={className}>
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
    <span className="text-[11px] font-bold tracking-[0.16em] text-[var(--makit-color-foreground)] uppercase">
      {node.title}
    </span>
  );
  if (!node.collapsible) {
    return (
      <div className="mt-7">
        {node.title && <div className="mb-2 px-4">{label}</div>}
        {children}
      </div>
    );
  }
  return (
    <details className="mt-7" open={!node.collapsed || containsRoute(node, currentRoute)}>
      <summary className="mb-2 flex cursor-pointer list-none items-center justify-between px-4">
        {label}
        <span className="makit-editorial-marker text-xs text-[var(--makit-color-subtle)]">＋</span>
      </summary>
      {children}
    </details>
  );
}

export function NavigationItems({ items, currentRoute, depth = 0 }: NavigationItemsProps) {
  return (
    <ul className={depth ? "ml-3" : ""}>
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
