import type { NavigationItem } from "../data/types.js";

function ItemLink({ item, currentRoute }: { item: NavigationItem; currentRoute: string }) {
  if (!item.href) {
    return (
      <span className="text-sm font-medium text-[var(--makit-color-foreground)]">{item.title}</span>
    );
  }
  const isActive = item.href === currentRoute;
  const external = item.external ?? false;
  return (
    <a
      href={item.href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-current={isActive ? "page" : undefined}
      className={
        isActive
          ? "block rounded-[var(--makit-radius)] bg-[var(--makit-color-muted)] px-2 py-1 text-sm font-medium text-[var(--makit-color-accent)]"
          : "block rounded-[var(--makit-radius)] px-2 py-1 text-sm text-[var(--makit-color-foreground)] hover:bg-[var(--makit-color-muted)]"
      }
    >
      {item.title}
    </a>
  );
}

export function NavigationItems({
  items,
  currentRoute,
  depth = 0,
}: {
  items: readonly NavigationItem[];
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
      {items.map((item) => (
        <li key={`${item.title}-${item.href ?? ""}`}>
          <ItemLink item={item} currentRoute={currentRoute} />
          {item.items && item.items.length > 0 && (
            <NavigationItems items={item.items} currentRoute={currentRoute} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}
