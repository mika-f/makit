import { z } from "zod";
import type { GlobalNavigationItem, NavigationItem } from "../types/config.js";
import type { NavigationNode } from "../metadata/types.js";

const navigationNodeSchema: z.ZodType<NavigationNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.strictObject({
      type: z.literal("page"),
      page: z.string().min(1),
      title: z.string().optional(),
      hidden: z.boolean().optional(),
    }),
    z.strictObject({
      type: z.literal("section"),
      id: z.string().optional(),
      title: z.string().min(1),
      page: z.string().optional(),
      items: z.array(navigationNodeSchema),
      collapsible: z.boolean().optional(),
      collapsed: z.boolean().optional(),
    }),
    z.strictObject({
      type: z.literal("group"),
      id: z.string().optional(),
      title: z.string().optional(),
      items: z.array(navigationNodeSchema),
      collapsible: z.boolean().optional(),
      collapsed: z.boolean().optional(),
    }),
    z.strictObject({
      type: z.literal("link"),
      title: z.string().min(1),
      href: z.string().min(1),
      external: z.boolean().optional(),
    }),
    z.strictObject({
      type: z.literal("collection"),
      collection: z.string().min(1),
      title: z.string().optional(),
    }),
  ]),
) as z.ZodType<NavigationNode>;

const collectionNavigationConfigSchema = z.union([
  z.strictObject({
    mode: z.literal("auto"),
    includeFallbackPages: z.boolean().optional(),
  }),
  z.strictObject({
    mode: z.literal("manual"),
    items: z.array(navigationNodeSchema),
  }),
]);

const localizedValueSchema = z.union([z.string(), z.record(z.string(), z.string())]);

const collectionSeoSchema = z.strictObject({
  image: z.string().optional(),
  noindex: z.boolean().optional(),
});

const collectionMetadataSchema = z.strictObject({
  id: z.string().min(1),
  title: localizedValueSchema,
  description: localizedValueSchema.optional(),
  path: z.string().optional(),
  index: z.string().optional(),
  icon: z.string().optional(),
  hidden: z.boolean().optional(),
  seo: collectionSeoSchema.optional(),
});

const collectionsConfigSchema = z.union([
  z.array(collectionMetadataSchema),
  z.strictObject({ mode: z.literal("discover") }),
]);

const homeConfigSchema = z.strictObject({
  layout: z.enum(["page", "portal"]).optional(),
  page: z.string().optional(),
  featuredCollections: z.array(z.string()).optional(),
  sections: z
    .array(
      z.strictObject({
        title: localizedValueSchema.optional(),
        collections: z.array(z.string()),
      }),
    )
    .optional(),
});

const localeConfigSchema = z.strictObject({
  locale: z.string().min(1),
  label: z.string().optional(),
  lang: z.string().optional(),
  dir: z.enum(["ltr", "rtl"]).optional(),
  sourceDir: z.string().optional(),
});

const localeFallbackConfigSchema = z.strictObject({
  enabled: z.boolean().optional(),
  behavior: z.enum(["render", "redirect", "not-found"]).optional(),
  showNotice: z.boolean().optional(),
});

const messagesSchema = z.strictObject({
  fallbackNotice: z.string(),
  home: z.string(),
});

const i18nConfigSchema = z.strictObject({
  defaultLocale: z.string().min(1),
  locales: z.array(localeConfigSchema).min(1),
  fallback: z.union([z.boolean(), localeFallbackConfigSchema]).optional(),
  collectionFallback: z
    .strictObject({
      behavior: z.enum(["render", "redirect", "hidden", "not-found"]).optional(),
    })
    .optional(),
  root: z
    .strictObject({
      behavior: z.enum(["default", "detect", "select"]).optional(),
      locale: z.string().optional(),
    })
    .optional(),
  localeSwitcher: z
    .strictObject({
      missingPage: z.enum(["fallback", "locale-root", "disabled"]).optional(),
    })
    .optional(),
  messages: z.record(z.string(), messagesSchema.partial()).optional(),
});

const navigationItemSchema: z.ZodType<NavigationItem> = z.strictObject({
  title: z.string().min(1),
  href: z.string().optional(),
  external: z.boolean().optional(),
  items: z.array(z.lazy(() => navigationItemSchema)).optional(),
});

const navigationGroupSchema = z.strictObject({
  title: z.string().optional(),
  items: z.array(navigationItemSchema),
});

const globalNavigationItemSchema: z.ZodType<GlobalNavigationItem> = z
  .strictObject({
    title: z.string().min(1),
    href: z.string().optional(),
    collection: z.string().optional(),
    external: z.boolean().optional(),
    items: z.array(z.lazy(() => globalNavigationItemSchema)).optional(),
  })
  .refine((item) => !(item.href !== undefined && item.collection !== undefined), {
    message: "`href` and `collection` cannot be set on the same global navigation item (spec §26)",
  });

const globalNavigationGroupSchema = z.strictObject({
  title: z.string().optional(),
  items: z.array(globalNavigationItemSchema),
});

const paginationConfigSchema = z.strictObject({
  enabled: z.boolean().optional(),
  crossSection: z.boolean().optional(),
});

const navigationConfigSchema = z.strictObject({
  mode: z.enum(["auto", "manual"]).optional(),
  includeFallbackPages: z.boolean().optional(),
  locales: z.record(z.string(), z.array(navigationGroupSchema)).optional(),
  collections: z.record(z.string(), collectionNavigationConfigSchema).optional(),
  global: z.array(globalNavigationGroupSchema).optional(),
  pagination: paginationConfigSchema.optional(),
});

const headerLinkSchema = z.strictObject({
  label: z.string().min(1),
  href: z.string().min(1),
  external: z.boolean().optional(),
});

const headerConfigSchema = z.strictObject({
  logo: z.string().optional(),
  title: z.string().optional(),
  links: z.array(headerLinkSchema).optional(),
});

const footerLinkSchema = z.strictObject({
  label: z.string().min(1),
  href: z.string().min(1),
  external: z.boolean().optional(),
});

const footerConfigSchema = z.strictObject({
  copyright: z.string().optional(),
  links: z.array(footerLinkSchema).optional(),
});

const themeConfigSchema = z.strictObject({
  colorScheme: z.enum(["light", "dark", "system"]).optional(),
  accentColor: z.string().optional(),
  radius: z.enum(["none", "small", "medium", "large"]).optional(),
  breadcrumbs: z
    .strictObject({
      enabled: z.boolean().optional(),
      showHome: z.boolean().optional(),
      showCurrentPage: z.boolean().optional(),
    })
    .optional(),
  codeTheme: z
    .union([
      z.string(),
      z.strictObject({
        light: z.string(),
        dark: z.string(),
      }),
    ])
    .optional(),
});

const externalLinksConfigSchema = z.strictObject({
  target: z.enum(["_blank", "_self", "_parent", "_top"]).optional(),
  rel: z.string().optional(),
});

const codeBlockConfigSchema = z.strictObject({
  copyButton: z.boolean().optional(),
  lineNumbers: z.boolean().optional(),
});

const shikiConfigSchema = z.strictObject({
  theme: z.string().optional(),
  themes: z
    .strictObject({
      light: z.string(),
      dark: z.string(),
    })
    .optional(),
  languages: z.array(z.string()).optional(),
  unknownLanguage: z.enum(["error", "warning", "plain-text"]).optional(),
});

const tableOfContentsConfigSchema = z.strictObject({
  minDepth: z.number().int().min(1).max(6).optional(),
  maxDepth: z.number().int().min(1).max(6).optional(),
});

const markdownConfigSchema = z.strictObject({
  gfm: z.boolean().optional(),
  headingIds: z.boolean().optional(),
  allowDangerousHtml: z.boolean().optional(),
  externalLinks: externalLinksConfigSchema.optional(),
  code: codeBlockConfigSchema.optional(),
  shiki: shikiConfigSchema.optional(),
  tableOfContents: tableOfContentsConfigSchema.optional(),
  remarkPlugins: z.array(z.unknown()).optional(),
  rehypePlugins: z.array(z.unknown()).optional(),
});

const seoConfigSchema = z.strictObject({
  titleTemplate: z.string().optional(),
  defaultImage: z.string().optional(),
});

const sitemapConfigSchema = z.strictObject({
  enabled: z.boolean().optional(),
  includeFallbackPages: z.boolean().optional(),
});

const buildConfigSchema = z.strictObject({
  clean: z.boolean().optional(),
  trailingSlash: z.boolean().optional(),
});

const devConfigSchema = z.strictObject({
  port: z.number().int().min(1).max(65535).optional(),
  host: z.string().optional(),
  open: z.boolean().optional(),
});

const previewConfigSchema = z.strictObject({
  port: z.number().int().min(1).max(65535).optional(),
  host: z.string().optional(),
  open: z.boolean().optional(),
});

const warningCodeSchema = z.enum([
  "missing-title",
  "missing-page-metadata",
  "generated-page-id",
  "multiple-placement-without-primary",
  "deep-navigation",
  "empty-section",
  "empty-group",
  "missing-translation",
  "unknown-code-language",
  "page-not-in-navigation",
  "broken-link",
  "missing-anchor",
  "missing-site-url",
  "missing-og-image",
  "default-locale-only-page",
  "translation-only-page",
  "too-many-fallback-pages",
  "collection-fallback",
  "env-var-in-metadata",
  "out-of-project-import",
  "slow-metadata-eval",
]);

const failOnCodeSchema = z.union([
  warningCodeSchema,
  z.enum(["duplicate-route", "duplicate-page-id"]),
]);

const validationConfigSchema = z.strictObject({
  strict: z.boolean().optional(),
  disallowFrontMatter: z.boolean().optional(),
  failOn: z.array(failOnCodeSchema).optional(),
});

const deploymentConfigSchema = z.strictObject({
  adapter: z.unknown().optional(),
  configFile: z
    .strictObject({
      mode: z.enum(["generated", "merge", "manual"]).optional(),
    })
    .optional(),
  redirects: z.boolean().optional(),
  headers: z.boolean().optional(),
  cleanUrls: z.boolean().optional(),
  customDomain: z.string().min(1).optional(),
  generateCi: z.boolean().optional(),
  preview: z
    .strictObject({
      enabled: z.boolean().optional(),
    })
    .optional(),
});

const redirectSchema = z.strictObject({
  from: z.string().min(1),
  to: z.string().min(1),
  status: z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)]),
  conditions: z
    .strictObject({
      language: z.array(z.string()).optional(),
      country: z.array(z.string()).optional(),
    })
    .optional(),
  force: z.boolean().optional(),
  source: z.enum(["user", "i18n-root", "i18n-fallback", "clean-url", "migration"]).optional(),
});

const headerRuleSchema = z.strictObject({
  path: z.string().min(1),
  headers: z.record(z.string(), z.string()),
});

const experimentalConfigSchema = z.record(z.string(), z.unknown());

export const makitConfigSchema = z.strictObject({
  title: z.string().min(1, "title is required"),
  description: z.string().optional(),
  lang: z.string().optional(),
  siteUrl: z.string().url().optional(),
  sourceDir: z.string().optional(),
  publicDir: z.string().optional(),
  outDir: z.string().optional(),
  basePath: z.string().optional(),
  collections: collectionsConfigSchema.optional(),
  home: homeConfigSchema.optional(),
  i18n: i18nConfigSchema.optional(),
  navigation: navigationConfigSchema.optional(),
  header: headerConfigSchema.optional(),
  footer: footerConfigSchema.optional(),
  theme: themeConfigSchema.optional(),
  markdown: markdownConfigSchema.optional(),
  styles: z.array(z.string()).optional(),
  seo: seoConfigSchema.optional(),
  sitemap: sitemapConfigSchema.optional(),
  build: buildConfigSchema.optional(),
  dev: devConfigSchema.optional(),
  preview: previewConfigSchema.optional(),
  validation: validationConfigSchema.optional(),
  deployment: deploymentConfigSchema.optional(),
  redirects: z.array(redirectSchema).optional(),
  headers: z.array(headerRuleSchema).optional(),
  experimental: experimentalConfigSchema.optional(),
});

export type MakitConfigInput = z.input<typeof makitConfigSchema>;
export type MakitConfigParsed = z.output<typeof makitConfigSchema>;
