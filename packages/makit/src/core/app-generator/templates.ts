import type { ResolvedConfig } from "../../types/resolved-config.js";

export function rootLayoutTemplate(): string {
  return `import "../styles/globals.css";
import { ThemeScript, ThemeVariables, getSiteData } from "@natsuneko-laboratory/makit-runtime";

export default async function RootLayout({ children }) {
  const site = await getSiteData();
  const colorScheme = site.theme.colorScheme;

  return (
    <html lang={site.lang} data-theme={colorScheme !== "system" ? colorScheme : undefined}>
      <body>
        <ThemeVariables theme={site.theme} />
        {colorScheme === "system" && <ThemeScript />}
        {children}
      </body>
    </html>
  );
}
`;
}

export function notFoundTemplate(): string {
  return `import { NotFoundPage } from "@natsuneko-laboratory/makit-runtime";

export default function NotFound() {
  return <NotFoundPage />;
}
`;
}

export function rootPageTemplate(): string {
  return `import { getHomeRoute, getLocalesData, getSiteData, RootPage } from "@natsuneko-laboratory/makit-runtime";

export default async function Page() {
  const [i18n, site] = await Promise.all([getLocalesData(), getSiteData()]);

  const defaultLocaleConfig = i18n.locales.find((locale) => locale.locale === i18n.defaultLocale);
  const defaultHref =
    (defaultLocaleConfig && (await getHomeRoute(defaultLocaleConfig.urlLocale))) ?? \`\${site.basePath}/\`;

  const locales = await Promise.all(
    i18n.locales.map(async (locale) => ({
      locale: locale.locale,
      urlLocale: locale.urlLocale,
      label: locale.label,
      href: (await getHomeRoute(locale.urlLocale)) ?? defaultHref,
    })),
  );

  return (
    <RootPage behavior={i18n.root.behavior} locales={locales} defaultHref={defaultHref} siteTitle={site.title} />
  );
}
`;
}

/** The `[[...slug]]` page, shared by both the i18n-enabled `[locale]/[[...slug]]` route and the single-locale root `[[...slug]]` route. */
export function slugPageTemplate(localeExpression: string): string {
  return `import { notFound } from "next/navigation";
import {
  DocsPage,
  PortalHomePage,
  buildPageMetadata,
  buildSiteMetadata,
  getAllStaticParams,
  getCollectionNavigation,
  getHomeData,
  getLocalesData,
  getPageForRoute,
  getRouteEntry,
  getSiteData,
} from "@natsuneko-laboratory/makit-runtime";

export async function generateStaticParams() {
  ${localeExpression === "params.locale" ? "return getAllStaticParams();" : "const params = await getAllStaticParams();\n  return params.map((param) => ({ slug: param.slug }));"}
}

export async function generateMetadata({ params }) {
  params = await params;
  const locale = ${localeExpression};
  const entry = await getRouteEntry(locale, params.slug ?? []);
  if (!entry) return {};
  const site = await getSiteData();
  if (entry.kind === "portal") return buildSiteMetadata(site);
  const page = await getPageForRoute(locale, params.slug ?? []);
  if (!page) return {};
  return buildPageMetadata(page, site);
}

export default async function Page({ params }) {
  params = await params;
  const locale = ${localeExpression};
  const entry = await getRouteEntry(locale, params.slug ?? []);
  if (!entry) notFound();

  const [site, i18n] = await Promise.all([getSiteData(), getLocalesData()]);

  if (entry.kind === "portal") {
    const home = await getHomeData(locale);
    return <PortalHomePage home={home} site={site} i18n={i18n} locale={locale} />;
  }

  const page = await getPageForRoute(locale, params.slug ?? []);
  if (!page) notFound();
  const navigation = await getCollectionNavigation(locale, page.collectionId);

  return <DocsPage page={page} site={site} i18n={i18n} navigation={navigation} />;
}
`;
}

export function nextConfigTemplate(config: ResolvedConfig, turbopackRoot: string): string {
  return `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: ${JSON.stringify(config.build.trailingSlash)},
  basePath: ${JSON.stringify(config.basePath)},
  images: { unoptimized: true },
  turbopack: {
    // .makit/'s runtime deps are symlinked in from makit's own dependency
    // tree (spec §40.5) rather than living directly under .makit/node_modules
    // as real files. Their symlink targets can land outside the project root
    // (e.g. a pnpm workspace's shared store), so root is the common ancestor
    // of the project and every linked package, not just the project itself —
    // otherwise Turbopack misdetects the workspace root from the symlinks.
    root: ${JSON.stringify(turbopackRoot)},
  },
};

export default nextConfig;
`;
}

export function postcssConfigTemplate(): string {
  return `export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
`;
}

export interface GlobalsCssOptions {
  makitRuntimeDistPath: string;
  customStyleImports: string[];
}

export function globalsCssTemplate(options: GlobalsCssOptions): string {
  const lines = [
    // `source(none)` is load-bearing: without it, Tailwind's automatic
    // source detection scans everything under `.makit/` — including
    // `.next/`, where Turbopack continuously rewrites chunk files that
    // embed makit-runtime's own class strings. Scanning a chunk mid-write
    // yields garbage candidates (real class names interleaved with stray
    // bytes), and Tailwind's dev-mode candidate cache never evicts, so one
    // torn read permanently corrupts the compiled CSS ("Parsing CSS source
    // code failed … Unexpected token Delim") until `.next` is deleted.
    // Every class source must therefore be listed explicitly below.
    '@import "tailwindcss" source(none);',
    '@plugin "@tailwindcss/typography";',
    "",
    '@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));',
    // makit-runtime's components (tsdown emits `.mjs`, never plain `.js`).
    `@source "${options.makitRuntimeDistPath}/**/*.mjs";`,
    // Rendered page HTML (spec §40) — how Tailwind classes written in the
    // user's own markdown/HTML content get picked up. Safe to scan because
    // these are written via atomic rename, never in place.
    '@source "../generated/**/*.json";',
    // The generated app shell itself (layout.js, page.js, ...).
    '@source "../app/**/*.js";',
    "",
    "html {",
    "  scroll-behavior: smooth;",
    "  scroll-padding-top: 6rem;",
    "}",
    "",
    "body {",
    "  margin: 0;",
    "  background: var(--makit-color-background);",
    "  color: var(--makit-color-foreground);",
    '  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
    "  -webkit-font-smoothing: antialiased;",
    "}",
    "",
    "::selection {",
    "  background: color-mix(in srgb, var(--makit-color-accent) 22%, transparent);",
    "}",
    "",
    ".makit-prose {",
    "  --tw-prose-body: var(--makit-color-subtle);",
    "  --tw-prose-headings: var(--makit-color-foreground);",
    "  --tw-prose-links: var(--makit-color-foreground);",
    "  --tw-prose-bold: var(--makit-color-foreground);",
    "  --tw-prose-counters: var(--makit-color-subtle);",
    "  --tw-prose-bullets: var(--makit-color-border-strong);",
    "  --tw-prose-hr: var(--makit-color-border);",
    "  --tw-prose-quotes: var(--makit-color-foreground);",
    "  --tw-prose-quote-borders: var(--makit-color-accent);",
    "  --tw-prose-captions: var(--makit-color-subtle);",
    "  --tw-prose-code: var(--makit-color-foreground);",
    "  --tw-prose-th-borders: var(--makit-color-border-strong);",
    "  --tw-prose-td-borders: var(--makit-color-border);",
    "  font-size: 1rem;",
    "  line-height: 1.8;",
    "}",
    "",
    ".makit-prose :where(h2, h3, h4) {",
    "  scroll-margin-top: 6rem;",
    "  letter-spacing: -0.02em;",
    "}",
    "",
    ".makit-prose > h1:first-child {",
    "  display: none;",
    "}",
    "",
    ".makit-prose :where(a):not(:where([class~='not-prose'] *)) {",
    "  text-decoration-color: color-mix(in srgb, var(--makit-color-foreground) 35%, transparent);",
    "  text-underline-offset: 0.2em;",
    "  transition: color 150ms ease, text-decoration-color 150ms ease;",
    "}",
    "",
    ".makit-prose :where(a):not(:where([class~='not-prose'] *)):hover {",
    "  color: var(--makit-color-accent);",
    "  text-decoration-color: var(--makit-color-accent);",
    "}",
    "",
    ".makit-prose :where(:not(pre) > code):not(:where([class~='not-prose'] *)) {",
    "  border: 1px solid color-mix(in srgb, var(--makit-color-accent) 16%, var(--makit-color-border));",
    "  border-radius: 0.35rem;",
    "  background: color-mix(in srgb, var(--makit-color-accent) 6%, var(--makit-color-muted));",
    "  padding: 0.15rem 0.35rem;",
    "  font-size: 0.85em;",
    "  font-weight: 500;",
    "}",
    "",
    ".makit-prose :where(:not(pre) > code):not(:where([class~='not-prose'] *))::before,",
    ".makit-prose :where(:not(pre) > code):not(:where([class~='not-prose'] *))::after {",
    "  content: none;",
    "}",
    "",
    "pre.shiki {",
    "  position: relative;",
    "  overflow-x: auto;",
    "  padding: 3.5rem 1.25rem 1.25rem;",
    "  border: 1px solid color-mix(in srgb, var(--makit-color-accent) 18%, var(--makit-color-border));",
    "  border-radius: max(var(--makit-radius), 0.75rem);",
    "  background: color-mix(in srgb, var(--makit-color-accent) 4%, var(--makit-color-surface)) !important;",
    "  box-shadow: 0 1px 2px rgb(0 0 0 / 0.04);",
    "}",
    "",
    "pre.shiki::before {",
    "  content: attr(data-label);",
    "  position: absolute;",
    "  top: 0;",
    "  left: 0;",
    "  display: flex;",
    "  align-items: center;",
    "  height: 2.75rem;",
    "  padding: 0 1.25rem;",
    "  color: var(--makit-color-subtle);",
    "  font-family: ui-sans-serif, system-ui, sans-serif;",
    "  font-size: 0.7rem;",
    "  font-weight: 600;",
    "  letter-spacing: 0.08em;",
    "  text-transform: uppercase;",
    "}",
    "",
    "pre.shiki[data-filename]::before {",
    "  letter-spacing: normal;",
    "  text-transform: none;",
    "}",
    "",
    "pre.shiki::after {",
    "  content: '';",
    "  position: absolute;",
    "  top: 2.75rem;",
    "  right: 0;",
    "  left: 0;",
    "  height: 1px;",
    "  background: color-mix(in srgb, var(--makit-color-accent) 14%, var(--makit-color-border));",
    "}",
    "",
    ":root[data-theme='dark'] pre.shiki,",
    ":root[data-theme='dark'] pre.shiki span {",
    "  color: var(--shiki-dark) !important;",
    "}",
    "",
    ".makit-copy-button {",
    "  position: absolute;",
    "  z-index: 1;",
    "  top: 0.5rem;",
    "  right: 0.625rem;",
    "  height: 1.75rem;",
    "  padding: 0 0.625rem;",
    "  border-radius: 0.45rem;",
    "  border: 1px solid color-mix(in srgb, var(--makit-color-accent) 16%, var(--makit-color-border));",
    "  background: color-mix(in srgb, var(--makit-color-accent) 5%, var(--makit-color-surface));",
    "  color: var(--makit-color-subtle);",
    "  cursor: pointer;",
    "  font-family: ui-sans-serif, system-ui, sans-serif;",
    "  font-size: 0.7rem;",
    "  font-weight: 500;",
    "  transition: border-color 150ms ease, background 150ms ease, color 150ms ease;",
    "}",
    "",
    ".makit-copy-button:hover {",
    "  border-color: color-mix(in srgb, var(--makit-color-accent) 40%, var(--makit-color-border));",
    "  background: color-mix(in srgb, var(--makit-color-accent) 12%, var(--makit-color-surface));",
    "  color: var(--makit-color-accent);",
    "}",
    "",
    ".makit-copy-button:focus-visible {",
    "  outline: 2px solid var(--makit-color-accent);",
    "  outline-offset: 2px;",
    "}",
    "",
  ];

  for (const importPath of options.customStyleImports) {
    lines.push(`@import "${importPath}";`);
  }

  return `${lines.join("\n")}\n`;
}
