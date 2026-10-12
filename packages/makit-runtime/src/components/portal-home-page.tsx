import { getGlobalNavigation, getHomeRoute, getSearchIndex } from "../data/loaders.js";
import type { I18nData, PortalCollectionCard, PortalHomeData, SiteData } from "../data/types.js";
import type { LocaleLink } from "../i18n/static-page-locale-links.js";
import type { ThemeComponents } from "../theme/components.js";
import { HeaderActions } from "./header-actions.js";
import { LocaleLinks } from "./locale-links.js";
import { RouteLink } from "./route-link.js";

function CollectionCard({ card }: { card: PortalCollectionCard }) {
  return (
    <RouteLink
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
    </RouteLink>
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
  /** The resolved slot map (THEME §6). */
  components: ThemeComponents;
}

/** The portal-layout site home (spec §33.2): a hero plus per-collection cards. */
export async function PortalHomePage({
  home,
  site,
  i18n,
  locale,
  components: C,
}: PortalHomePageProps) {
  const homeHref = (await getHomeRoute(locale)) ?? `${site.basePath}/`;
  const [globalNavigation, searchEntries] = await Promise.all([
    getGlobalNavigation(locale),
    getSearchIndex(locale),
  ]);

  const localeLinks: LocaleLink[] =
    i18n.enabled && i18n.locales.length > 1
      ? await Promise.all(
          i18n.locales.map(async (candidate) => ({
            locale: candidate,
            href: (await getHomeRoute(candidate.urlLocale)) ?? homeHref,
            current: candidate.urlLocale === locale,
          })),
        )
      : [];

  const headerActions = (
    <HeaderActions site={site} searchEntries={searchEntries} components={C}>
      <LocaleLinks links={localeLinks} />
    </HeaderActions>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[var(--makit-color-background)] text-[var(--makit-color-foreground)]">
      <C.Header
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
      <C.Footer footer={site.footer} />
    </div>
  );
}
