import Link from "next/link";
import type {
  NavigationItemsProps,
  ResolvedNavContainerNode,
  ResolvedNavNode,
} from "@natsuneko-laboratory/makit-runtime";
import { ChevronDown, ExternalArrow } from "./icons.js";

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
    return (
      <span className="block px-3 py-1.5 text-sm font-medium text-[var(--makit-color-foreground)]">
        {title}
      </span>
    );
  }

  const isActive = href === currentRoute;
  const className = isActive
    ? "flex items-center gap-1.5 rounded-lg bg-[color-mix(in_srgb,var(--makit-color-accent)_12%,transparent)] px-3 py-1.5 text-sm font-medium text-[var(--makit-color-accent)]"
    : "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-[var(--makit-color-subtle)] transition hover:bg-[var(--makit-color-muted)] hover:text-[var(--makit-color-foreground)]";

  const body = (
    <>
      <span className="truncate">{title}</span>
      {external && <ExternalArrow className="size-3 shrink-0 opacity-60" />}
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
    <span className="text-[11px] font-semibold tracking-[0.1em] text-[var(--makit-color-foreground)] uppercase">
      {label}
    </span>
  );
  const children = node.items.length > 0 && (
    <NavigationItems items={node.items} currentRoute={currentRoute} depth={depth + 1} />
  );

  if (!node.collapsible) {
    return (
      <div className="mb-1">
        {label && <div className="mt-6 mb-2 px-3">{heading}</div>}
        {children}
      </div>
    );
  }

  return (
    <details className="mb-1" open={!node.collapsed || containsRoute(node, currentRoute)}>
      <summary className="mt-6 mb-2 flex cursor-pointer list-none items-center justify-between gap-2 px-3">
        {heading}
        <ChevronDown className="makit-product-marker size-3.5 text-[var(--makit-color-subtle)] transition-transform" />
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
          ? "space-y-0.5"
          : "mt-0.5 ml-3 space-y-0.5 border-l border-[var(--makit-color-border)] pl-2"
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
