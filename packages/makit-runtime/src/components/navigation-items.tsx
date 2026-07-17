import type { ResolvedNavContainerNode, ResolvedNavNode } from "../data/types.js";

function containsRoute(node: ResolvedNavNode, currentRoute: string): boolean {
  if (node.type === "page") return node.href === currentRoute;
  if (node.type === "link") return false;
  if (node.href === currentRoute) return true;
  return node.items.some((item) => containsRoute(item, currentRoute));
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
  if (!href) {
    return <span className="text-sm font-medium text-[var(--makit-color-foreground)]">{title}</span>;
  }
  const isActive = href === currentRoute;
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-current={isActive ? "page" : undefined}
      className={
        isActive
          ? "block rounded-[var(--makit-radius)] bg-[var(--makit-color-muted)] px-2 py-1 text-sm font-medium text-[var(--makit-color-accent)]"
          : "block rounded-[var(--makit-radius)] px-2 py-1 text-sm text-[var(--makit-color-foreground)] hover:bg-[var(--makit-color-muted)]"
      }
    >
      {title}
    </a>
  );
}

/**
 * A section/group container. Ancestors of the current page auto-expand
 * regardless of the authored `collapsed` default (spec §38). Uses a
 * zero-JS `<details>` disclosure when `collapsible` is set, matching the
 * rest of the theme's no-JS-required navigation.
 */
function NavContainer({
  node,
  currentRoute,
  depth,
}: {
  node: ResolvedNavContainerNode;
  currentRoute: string;
  depth: number;
}) {
  const label = node.title ?? "";
  const heading = <ItemLink title={label} href={node.href} currentRoute={currentRoute} />;
  const children = node.items.length > 0 && (
    <NavigationItems items={node.items} currentRoute={currentRoute} depth={depth + 1} />
  );

  if (!node.collapsible) {
    return (
      <div>
        {label && (
          <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-[var(--makit-color-foreground)] opacity-60">
            {heading}
          </div>
        )}
        {children}
      </div>
    );
  }

  const open = !node.collapsed || containsRoute(node, currentRoute);
  return (
    <details open={open}>
      <summary className="cursor-pointer list-none px-2 text-xs font-semibold uppercase tracking-wide text-[var(--makit-color-foreground)] opacity-60">
        {heading}
      </summary>
      <div className="mt-1">{children}</div>
    </details>
  );
}

export function NavigationItems({
  items,
  currentRoute,
  depth = 0,
}: {
  items: readonly ResolvedNavNode[];
  currentRoute: string;
  depth?: number;
}) {
  return (
    <ul
      className={
        depth === 0
          ? "space-y-1"
          : "ml-3 mt-1 space-y-1 border-l border-[var(--makit-color-border)] pl-3"
      }
    >
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
