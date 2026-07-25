import Link from "next/link";
import type { BreadcrumbsProps } from "@natsuneko-laboratory/makit-runtime";
import { ChevronRight } from "./icons.js";

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-6 flex flex-wrap items-center gap-1 text-[13px] text-[var(--makit-color-subtle)]"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.title}-${index}`} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="size-3.5 opacity-50" />}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="transition hover:text-[var(--makit-color-foreground)]"
              >
                {item.title}
              </Link>
            ) : (
              <span
                aria-current={isLast ? "page" : undefined}
                className={isLast ? "font-medium text-[var(--makit-color-foreground)]" : undefined}
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
