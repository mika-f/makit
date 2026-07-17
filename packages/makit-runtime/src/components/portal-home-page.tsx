import Link from "next/link";
import { getGlobalNavigation, getHomeRoute, getSearchIndex } from "../data/loaders.js";
import type { I18nData, PortalCollectionCard, PortalHomeData, SiteData } from "../data/types.js";
import { Footer } from "./footer.js";
import { Header } from "./header.js";
import { SearchDialog } from "./search-dialog.js";
import { ThemeToggle } from "./theme-toggle.js";

function CollectionCard({ card }: { card: PortalCollectionCard }) {
  return (
    <Link
      href={card.href}
      className="group block rounded-2xl border border-[var(--makit-color-border)] bg-[var(--makit-color-surface)] p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--makit-color-border-strong)] hover:shadow-lg"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-tight text-[var(--makit-color-foreground)]">
          {card.title}
        </h3>
        <span className="text-[var(--makit-color-subtle)] transition group-hover:translate-x-1 group-hover:text-[var(--makit-color-accent)]">
          →
        </span>
      </div>
      {card.description && (
        <p className="mt-2 text-sm leading-6 text-[var(--makit-color-subtle)]">
          {card.description}
        </p>
      )}
    </Link>
  );
}

function CardGrid({ cards }: { cards: readonly PortalCollectionCard[] }) {
  if (cards.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <CollectionCard key={card.id} card={card} />
      ))}
    </div>
  );
}

export interface PortalHomePageProps {
  home: PortalHomeData;
  site: SiteData;
  i18n: I18nData;
  locale: string;
}

/** The portal-layout site home (spec §33.2): a hero plus per-collection cards. */
export async function PortalHomePage({ home, site, i18n, locale }: PortalHomePageProps) {
  const homeHref = (await getHomeRoute(locale)) ?? `${site.basePath}/`;
  const [globalNavigation, searchEntries] = await Promise.all([
    getGlobalNavigation(locale),
    getSearchIndex(locale),
  ]);

  const localeLinks =
    i18n.enabled && i18n.locales.length > 1
      ? await Promise.all(
          i18n.locales.map(async (candidate) => ({
            locale: candidate,
            href: (await getHomeRoute(candidate.urlLocale)) ?? homeHref,
          })),
        )
      : [];

  const headerActions = (
    <>
      <SearchDialog
        entries={searchEntries}
        pagefindEnabled={process.env.NODE_ENV === "production"}
        pagefindBundlePath={`${site.basePath}/pagefind/`}
      />
      {localeLinks.length > 1 && (
        <div className="flex items-center gap-1 text-sm">
          {localeLinks.map(({ locale: candidate, href }) => (
            <Link
              key={candidate.urlLocale}
              href={href}
              aria-current={candidate.urlLocale === locale ? "true" : undefined}
              className={
                candidate.urlLocale === locale
                  ? "rounded-[var(--makit-radius)] bg-[var(--makit-color-muted)] px-2 py-1 font-medium text-[var(--makit-color-accent)]"
                  : "rounded-[var(--makit-radius)] px-2 py-1 text-[var(--makit-color-foreground)] opacity-80 hover:opacity-100"
              }
            >
              {candidate.label}
            </Link>
          ))}
        </div>
      )}
      {site.theme.colorScheme === "system" && <ThemeToggle />}
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[var(--makit-color-background)] text-[var(--makit-color-foreground)]">
      <Header
        header={site.header}
        siteTitle={site.title}
        homeHref={homeHref}
        actions={headerActions}
        globalNavigation={globalNavigation}
      />
      <main
        data-pagefind-body
        className="mx-auto w-full max-w-6xl flex-1 px-5 py-16 sm:px-8 md:py-24"
      >
        <div className="max-w-3xl">
          <span className="mb-5 inline-flex rounded-full border border-[var(--makit-color-border)] bg-[var(--makit-color-muted)] px-3 py-1 text-xs font-medium text-[var(--makit-color-subtle)]">
            Documentation
          </span>
          <h1 className="text-5xl font-semibold tracking-[-0.045em] sm:text-6xl">{site.title}</h1>
          {site.description && (
            <p className="mt-5 max-w-2xl text-xl leading-8 text-[var(--makit-color-subtle)]">
              {site.description}
            </p>
          )}
        </div>

        <div className="mt-14">
          <CardGrid cards={home.featuredCollections} />
        </div>

        {home.sections.map((section, index) => (
          <section key={section.title ?? `section-${index}`} className="mt-16">
            {section.title && (
              <h2 className="mb-5 text-xl font-semibold tracking-tight">{section.title}</h2>
            )}
            <CardGrid cards={section.collections} />
          </section>
        ))}
      </main>
      <Footer footer={site.footer} />
    </div>
  );
}
