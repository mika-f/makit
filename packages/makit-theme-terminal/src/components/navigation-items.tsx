import Link from "next/link";
import type {
  NavigationItemsProps,
  ResolvedNavContainerNode,
  ResolvedNavNode,
} from "@natsuneko-laboratory/makit-runtime";

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
    return <span className="text-[13px] text-[var(--makit-color-foreground)]">{title}</span>;
  }

  const isActive = href === currentRoute;
  const className = isActive
    ? "flex items-center gap-1.5 border-l-2 border-[var(--makit-color-accent)] bg-[color-mix(in_srgb,var(--makit-color-accent)_10%,transparent)] py-1 pr-2 pl-2 text-[13px] font-medium text-[var(--makit-color-accent)]"
    : "flex items-center gap-1.5 border-l-2 border-transparent py-1 pr-2 pl-2 text-[13px] text-[var(--makit-color-subtle)] transition hover:border-[var(--makit-color-border-strong)] hover:text-[var(--makit-color-foreground)]";

  const body = (
    <>
      <span aria-hidden="true" className="opacity-50 select-none">
        {isActive ? ">" : "·"}
      </span>
      <span className="truncate">{title}</span>
      {external && (
        <span aria-hidden="true" className="opacity-60">
          ↗
        </span>
      )}
    </>
  );

  return external ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-current={isActive ? "page" : undefined}
      className={className}
    >
      {body}
    </a>
  ) : (
    <Link href={href} aria-current={isActive ? "page" : undefined} className={className}>
      {body}
    </Link>
  );
}

/**
 * A section/group. Ancestors of the current page open regardless of the
 * authored `collapsed` default, and the disclosure is a plain `<details>` so
 * navigation works with JavaScript disabled — same contract as the standard
 * theme, different chrome.
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
  const heading = (
    <span className="text-[11px] font-semibold tracking-[0.14em] text-[var(--makit-color-foreground)] uppercase">
      {label}
    </span>
  );
  const children = node.items.length > 0 && (
    <NavigationItems items={node.items} currentRoute={currentRoute} depth={depth + 1} />
  );

  if (!node.collapsible) {
    return (
      <div className="mb-1">
        {label && <div className="mt-4 mb-1.5 px-2">{heading}</div>}
        {children}
      </div>
    );
  }

  return (
    <details className="mb-1" open={!node.collapsed || containsRoute(node, currentRoute)}>
      <summary className="mt-4 mb-1.5 flex cursor-pointer list-none items-center gap-1.5 px-2">
        <span
          aria-hidden="true"
          className="makit-nav-marker text-[10px] text-[var(--makit-color-subtle)]"
        />
        {heading}
      </summary>
      {children}
    </details>
  );
}

export function NavigationItems({ items, currentRoute, depth = 0 }: NavigationItemsProps) {
  return (
    <ul
      className={
        depth === 0
          ? "space-y-px"
          : "mt-px ml-3 space-y-px border-l border-dashed border-[var(--makit-color-border)] pl-2"
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
