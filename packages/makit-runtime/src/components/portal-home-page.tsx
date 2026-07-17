import { getGlobalNavigation, getHomeRoute } from "../data/loaders.js";
import type { I18nData, PortalCollectionCard, PortalHomeData, SiteData } from "../data/types.js";
import { Footer } from "./footer.js";
import { Header } from "./header.js";
import { ThemeToggle } from "./theme-toggle.js";

function CollectionCard({ card }: { card: PortalCollectionCard }) {
  return (
    <a
      href={card.href}
      className="block rounded-[var(--makit-radius)] border border-[var(--makit-color-border)] p-6 hover:bg-[var(--makit-color-muted)]"
    >
      <h3 className="text-lg font-semibold text-[var(--makit-color-foreground)]">{card.title}</h3>
      {card.description && <p className="mt-1 text-sm opacity-70">{card.description}</p>}
    </a>
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
  const globalNavigation = await getGlobalNavigation(locale);

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
      {localeLinks.length > 1 && (
        <div className="flex items-center gap-1 text-sm">
          {localeLinks.map(({ locale: candidate, href }) => (
            <a
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
            </a>
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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 md:px-8">
        <h1 className="text-4xl font-bold">{site.title}</h1>
        {site.description && (
          <p className="mt-2 max-w-2xl text-lg opacity-70">{site.description}</p>
        )}

        <div className="mt-10">
          <CardGrid cards={home.featuredCollections} />
        </div>

        {home.sections.map((section, index) => (
          <section key={section.title ?? `section-${index}`} className="mt-12">
            {section.title && <h2 className="mb-4 text-xl font-semibold">{section.title}</h2>}
            <CardGrid cards={section.collections} />
          </section>
        ))}
      </main>
      <Footer footer={site.footer} />
    </div>
  );
}
