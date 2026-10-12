import type { LocaleLink } from "../i18n/static-page-locale-links.js";
import { RouteLink } from "./route-link.js";

/** A row of language links for page shells without a `LocaleSwitcher` page (portal home, static pages). */
export function LocaleLinks({ links }: { links: readonly LocaleLink[] }) {
  if (links.length < 2) return null;

  return (
    <div className="flex items-center gap-1 text-sm">
      {links.map(({ locale, href, current }) => (
        <RouteLink
          key={locale.urlLocale}
          href={href}
          aria-current={current ? "true" : undefined}
          className={
            current
              ? "rounded-[var(--makit-radius)] bg-[var(--makit-color-muted)] px-2 py-1 font-medium text-[var(--makit-color-accent)]"
              : "rounded-[var(--makit-radius)] px-2 py-1 text-[var(--makit-color-foreground)] opacity-80 hover:opacity-100"
          }
        >
          {locale.label}
        </RouteLink>
      ))}
    </div>
  );
}
