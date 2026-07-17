import type { GeneratedBreadcrumb } from "../data/types.js";

/** Site > Collection > Section > Group > Page (spec §31). The last item is never a link. */
export function Breadcrumbs({ items }: { items: readonly GeneratedBreadcrumb[] }) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 flex flex-wrap items-center gap-1 text-sm text-[var(--makit-color-foreground)] opacity-70"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.title}-${index}`} className="flex items-center gap-1">
            {index > 0 && <span aria-hidden="true">/</span>}
            {item.href && !isLast ? (
              <a href={item.href} className="hover:underline">
                {item.title}
              </a>
            ) : (
              <span aria-current={isLast ? "page" : undefined}>{item.title}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
