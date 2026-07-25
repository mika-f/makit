import Link from "next/link";
import type { BreadcrumbsProps } from "@natsuneko-laboratory/makit-runtime";

/** The trail rendered as a filesystem path: `~/guides/configuration`. */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 flex flex-wrap items-center text-xs text-[var(--makit-color-subtle)]"
    >
      <span aria-hidden="true" className="mr-1 text-[var(--makit-color-accent)]">
        ~
      </span>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.title}-${index}`} className="flex items-center">
            <span aria-hidden="true" className="text-[var(--makit-color-border-strong)]">
              /
            </span>
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="transition hover:text-[var(--makit-color-accent)] hover:underline"
              >
                {item.title}
              </Link>
            ) : (
              <span
                aria-current={isLast ? "page" : undefined}
                className={isLast ? "text-[var(--makit-color-foreground)]" : undefined}
              >
                {item.title}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
