import type { Metadata } from "next";
import type { GeneratedPage, SiteData } from "../data/types.js";

/** Builds a Next.js `Metadata` object for one page (spec §24). */
export function buildPageMetadata(page: GeneratedPage, site: SiteData): Metadata {
  const title = site.seo.titleTemplate.replace("%s", page.title);
  const description = page.description ?? site.description;
  const image = page.metadata.image ?? site.seo.defaultImage;

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

  return {
    title,
    description,
    robots: {
      index: !page.metadata.noindex,
      follow: !page.metadata.nofollow,
    },
    alternates: {
      canonical: page.metadata.canonical ?? page.route,
      languages,
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
