import { getManifest } from "../data/loaders.js";
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

  const manifest = await getManifest();
  const entriesForPageId = manifest.pages.filter((entry) => entry.pageId === page.pageId);

  const links: { locale: LocaleData; href: string }[] = [];
  for (const locale of locales) {
    const ownPage = entriesForPageId.find((entry) => entry.locale === locale.urlLocale);
    if (ownPage) {
      links.push({ locale, href: ownPage.route });
      continue;
    }
    if (missingPageBehavior === "locale-root") {
      const localeRoot = manifest.pages.find(
        (entry) => entry.locale === locale.urlLocale && entry.segments.length === 0,
      );
      if (localeRoot) links.push({ locale, href: localeRoot.route });
    }
    // "disabled" (or no root page to fall back to): omit this locale entirely.
  }

  if (links.length < 2) return null;

  return (
    <div className="flex items-center gap-1 text-sm">
      {links.map(({ locale, href }) => (
        <a
          key={locale.urlLocale}
          href={href}
          aria-current={locale.urlLocale === page.locale ? "true" : undefined}
          className={
            locale.urlLocale === page.locale
              ? "rounded-[var(--makit-radius)] bg-[var(--makit-color-muted)] px-2 py-1 font-medium text-[var(--makit-color-accent)]"
              : "rounded-[var(--makit-radius)] px-2 py-1 text-[var(--makit-color-foreground)] opacity-80 hover:opacity-100"
          }
        >
          {locale.label}
        </a>
      ))}
    </div>
  );
}
