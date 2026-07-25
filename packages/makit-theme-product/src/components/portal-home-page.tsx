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
import { ArrowRight } from "./icons.js";

function CollectionCard({ card }: { card: PortalCollectionCard }) {
  return (
    <Link
      href={card.href}
      className="makit-product-card group block rounded-2xl border border-[var(--makit-color-border)] bg-[var(--makit-color-surface)] p-6 transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--makit-color-accent)_45%,var(--makit-color-border))]"
    >
      <span
        aria-hidden="true"
        className="mb-4 flex size-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--makit-color-accent)_14%,transparent)] text-lg font-semibold text-[var(--makit-color-accent)]"
      >
        {card.title.slice(0, 1).toUpperCase()}
      </span>
      <span className="flex items-center justify-between gap-3">
        <span className="text-lg font-semibold tracking-tight text-[var(--makit-color-foreground)]">
          {card.title}
        </span>
        <ArrowRight className="size-4 shrink-0 text-[var(--makit-color-subtle)] transition group-hover:translate-x-0.5 group-hover:text-[var(--makit-color-accent)]" />
      </span>
      {card.description && (
        <span className="mt-2 block text-sm leading-6 text-[var(--makit-color-subtle)]">
          {card.description}
        </span>
      )}
    </Link>
  );
}

function CardGrid({ cards }: { cards: readonly PortalCollectionCard[] }) {
  if (cards.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <CollectionCard key={card.id} card={card} />
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
      <C.SearchDialog
        entries={searchEntries}
        pagefindEnabled={process.env.NODE_ENV === "production"}
        pagefindBundlePath={`${site.basePath}/pagefind/`}
      />
      {localeLinks.length > 1 && (
        <div className="hidden items-center gap-1 text-sm sm:flex">
          {localeLinks.map(({ locale: candidate, href }) => (
            <Link
              key={candidate.urlLocale}
              href={href}
              aria-current={candidate.urlLocale === locale ? "true" : undefined}
              className={
                candidate.urlLocale === locale
                  ? "rounded-full bg-[color-mix(in_srgb,var(--makit-color-accent)_12%,transparent)] px-3 py-1.5 font-medium text-[var(--makit-color-accent)]"
                  : "rounded-full px-3 py-1.5 text-[var(--makit-color-subtle)] transition hover:text-[var(--makit-color-foreground)]"
              }
            >
              {candidate.label}
            </Link>
          ))}
        </div>
      )}
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
      <main data-pagefind-body className="flex-1">
        {/* Hero: an accent wash that fades into the page background. */}
        <div className="relative overflow-hidden border-b border-[var(--makit-color-border)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-full bg-linear-to-b from-[color-mix(in_srgb,var(--makit-color-accent)_10%,transparent)] to-transparent"
          />
          <div className="relative mx-auto w-full max-w-[92rem] px-5 py-20 sm:px-10 md:py-28">
            <div className="max-w-3xl">
              <span className="mb-5 inline-flex rounded-full border border-[var(--makit-color-border)] bg-[var(--makit-color-surface)] px-3.5 py-1.5 text-xs font-medium text-[var(--makit-color-subtle)]">
                Documentation
              </span>
              <h1 className="text-5xl font-semibold tracking-[-0.045em] sm:text-6xl">
                {site.title}
              </h1>
              {site.description && (
                <p className="mt-6 max-w-2xl text-xl leading-8 text-[var(--makit-color-subtle)]">
                  {site.description}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[92rem] px-5 py-16 sm:px-10">
          <CardGrid cards={home.featuredCollections} />

          {home.sections.map((section, index) => (
            <section key={section.title ?? `section-${index}`} className="mt-16">
              {section.title && (
                <h2 className="mb-6 text-xl font-semibold tracking-tight">{section.title}</h2>
              )}
              <CardGrid cards={section.collections} />
            </section>
          ))}
        </div>
      </main>
      <C.Footer footer={site.footer} />
    </div>
  );
}
