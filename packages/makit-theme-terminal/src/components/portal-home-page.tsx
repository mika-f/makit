import Link from "next/link";
import {
  getGlobalNavigation,
  getHomeRoute,
  getSearchIndex,
} from "@natsuneko-laboratory/makit-runtime";
import type {
  PortalCollectionCard,
  PortalHomePageProps,
} from "@natsuneko-laboratory/makit-runtime";

function CollectionRow({ card }: { card: PortalCollectionCard }) {
  return (
    <Link
      href={card.href}
      className="group flex flex-col gap-1 border border-[var(--makit-color-border)] p-4 transition hover:border-[var(--makit-color-accent)] hover:bg-[color-mix(in_srgb,var(--makit-color-accent)_6%,transparent)]"
    >
      <span className="flex items-baseline gap-1.5 text-sm font-semibold">
        <span aria-hidden="true" className="text-[var(--makit-color-accent)]">
          ▸
        </span>
        {card.title}
      </span>
      {card.description && (
        <span className="text-[13px] leading-6 text-[var(--makit-color-subtle)]">
          {card.description}
        </span>
      )}
    </Link>
  );
}

function CardGrid({ cards }: { cards: readonly PortalCollectionCard[] }) {
  if (cards.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <CollectionRow key={card.id} card={card} />
      ))}
    </div>
  );
}

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

  const headerActions = (
    <>
      <C.SearchDialog
        entries={searchEntries}
        pagefindEnabled={process.env.NODE_ENV === "production"}
        pagefindBundlePath={`${site.basePath}/pagefind/`}
      />
      {site.theme.colorScheme === "system" && <C.ThemeToggle />}
    </>
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
      <main data-pagefind-body className="mx-auto w-full max-w-5xl flex-1 px-4 py-14 sm:px-6">
        <div className="max-w-2xl">
          <p className="mb-4 text-xs text-[var(--makit-color-subtle)]">
            <span aria-hidden="true" className="mr-1.5 text-[var(--makit-color-accent)]">
              $
            </span>
            cat README
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{site.title}</h1>
          {site.description && (
            <p className="mt-4 text-sm leading-7 text-[var(--makit-color-subtle)]">
              {site.description}
            </p>
          )}
        </div>

        <div className="mt-12">
          <CardGrid cards={home.featuredCollections} />
        </div>

        {home.sections.map((section, index) => (
          <section key={section.title ?? `section-${index}`} className="mt-12">
            {section.title && (
              <h2 className="mb-4 text-[11px] tracking-[0.18em] text-[var(--makit-color-subtle)] uppercase">
                <span aria-hidden="true" className="text-[var(--makit-color-accent)]">
                  —{" "}
                </span>
                {section.title}
              </h2>
            )}
            <CardGrid cards={section.collections} />
          </section>
        ))}

        {/* The locale switcher lives in the header on docs pages; the portal
            home has no page to switch between, so i18n is surfaced here. */}
        {i18n.enabled && i18n.locales.length > 1 && (
          <p className="mt-14 text-xs text-[var(--makit-color-subtle)]">
            {i18n.locales.length} locales available
          </p>
        )}
      </main>
      <C.Footer footer={site.footer} />
    </div>
  );
}
