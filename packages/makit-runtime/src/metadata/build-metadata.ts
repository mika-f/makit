import type { Metadata } from "next";
import type {
  GeneratedMetadata,
  GeneratedPage,
  GeneratedStaticPage,
  SiteData,
} from "../data/types.js";

interface DocumentMetadataInput {
  title: string;
  description?: string;
  route: string;
  metadata: GeneratedMetadata;
  /** hreflang → href, already resolved by the caller. */
  languages: Record<string, string>;
}

/** The shared `Metadata` shape of every routed document (spec §24). */
function buildDocumentMetadata(input: DocumentMetadataInput, site: SiteData): Metadata {
  const title = site.seo.titleTemplate.replace("%s", input.title);
  const description = input.description ?? site.description;
  const image = input.metadata.image ?? site.seo.defaultImage;

  return {
    title,
    description,
    robots: {
      index: !input.metadata.noindex,
      follow: !input.metadata.nofollow,
    },
    alternates: {
      canonical: input.metadata.canonical ?? input.route,
      languages: input.languages,
    },
    openGraph: {
      title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

/** Builds a Next.js `Metadata` object for one page (spec §24). */
export function buildPageMetadata(page: GeneratedPage, site: SiteData): Metadata {
  // Fallback pages are excluded from hreflang entirely (spec §16.12) — they
  // have no real translation of their own, so a self-referencing tag would
  // pair the *content's* locale with the *fallback's* URL, which is wrong.
  const languages: Record<string, string> = {};
  if (!page.isFallback) {
    for (const alternate of page.metadata.alternates) {
      languages[alternate.hreflang] = alternate.href;
    }
    // Every real page lists itself too, per standard hreflang practice.
    languages[page.contentLocale] = page.route;
  }

  return buildDocumentMetadata({ ...page, languages }, site);
}

/** Builds a Next.js `Metadata` object for one static page (STATIC-PAGES §12.3). */
export function buildStaticPageMetadata(page: GeneratedStaticPage, site: SiteData): Metadata {
  const languages: Record<string, string> = {};
  for (const alternate of page.metadata.alternates) {
    languages[alternate.hreflang] = alternate.href;
  }
  languages[page.locale] = page.route;

  return buildDocumentMetadata({ ...page, languages }, site);
}

/** Builds the site-wide default `Metadata` (spec §24.1), used by the root layout. */
export function buildSiteMetadata(site: SiteData): Metadata {
  return {
    title: {
      default: site.title,
      template: site.seo.titleTemplate,
    },
    description: site.description,
    metadataBase: site.siteUrl ? new URL(site.siteUrl) : undefined,
  };
}
