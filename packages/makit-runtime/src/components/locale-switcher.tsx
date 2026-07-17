import { getHomeRoute, getPageMap } from "../data/loaders.js";
import type { GeneratedPage, LocaleData, MissingPageBehavior } from "../data/types.js";

/** Switches between translations of the *same* page (spec §16.11, §17). */
export async function LocaleSwitcher({
  page,
  locales,
  missingPageBehavior,
}: {
  page: GeneratedPage;
  locales: readonly LocaleData[];
  missingPageBehavior: MissingPageBehavior;
}) {
  if (locales.length < 2) return null;

  const pageMap = await getPageMap();

  const links: { locale: LocaleData; href: string }[] = [];
  for (const locale of locales) {
    // Same collection + pageId in the target locale — a real translation or
    // its fallback page (spec §35.6 tiers 1-2).
    const ownPage = pageMap[locale.urlLocale]?.[page.collectionId]?.[page.pageId];
    if (ownPage) {
      links.push({ locale, href: ownPage.route });
      continue;
    }
    if (missingPageBehavior === "locale-root") {
      const localeRoot = await getHomeRoute(locale.urlLocale);
      if (localeRoot) links.push({ locale, href: localeRoot });
    }
    // "disabled" (or no root page to fall back to): omit this locale entirely.
  }

  if (links.length < 2) return null;

  return (
    <div className="hidden items-center gap-1 text-sm sm:flex">
      {links.map(({ locale, href }) => (
        <a
          key={locale.urlLocale}
          href={href}
          aria-current={locale.urlLocale === page.locale ? "true" : undefined}
          className={
            locale.urlLocale === page.locale
              ? "rounded-lg bg-[var(--makit-color-muted)] px-2 py-1.5 font-medium text-[var(--makit-color-foreground)]"
              : "rounded-lg px-2 py-1.5 text-[var(--makit-color-subtle)] transition hover:text-[var(--makit-color-foreground)]"
          }
        >
          {locale.label}
        </a>
      ))}
    </div>
  );
}
