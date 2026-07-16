export interface GeneratedHeading {
  id: string;
  depth: number;
  text: string;
}

export interface GeneratedAlternate {
  /** URL-facing locale (lowercase, e.g. "ja-jp"). */
  urlLocale: string;
  /** Original BCP-47 tag used as the `hreflang` attribute value (e.g. "ja-JP"). */
  hreflang: string;
  href: string;
}

export interface GeneratedMetadata {
  canonical?: string;
  noindex: boolean;
  nofollow: boolean;
  image?: string;
  /** Real translations only; filled in once the i18n resolver has cross-referenced all locales. */
  alternates: GeneratedAlternate[];
}

export interface GeneratedPage {
  pageId: string;
  route: string;
  segments: string[];
  /** URL-facing locale this page is served under (e.g. "ja-jp"). */
  locale: string;
  /** URL-facing locale the *content* actually comes from (differs from `locale` for fallback pages). */
  contentLocale: string;
  sourcePath: string;
  isFallback: boolean;
  fallbackSource?: string;
  title: string;
  description?: string;
  html: string;
  headings: GeneratedHeading[];
  draft: boolean;
  hidden: boolean;
  /** Sort order among siblings in auto-generated navigation (spec §14.6). Internal — not part of the public API. */
  order?: number;
  /** Navigation-specific overrides from front matter (spec §14, `navigation.title`/`navigation.group`). Internal. */
  navigation?: {
    title?: string;
    group?: string;
  };
  metadata: GeneratedMetadata;
}
