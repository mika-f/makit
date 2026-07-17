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
    "pre.shiki {",
    "  position: relative;",
    "  overflow-x: auto;",
    "  padding: 1rem;",
    "  border-radius: var(--makit-radius);",
    "}",
    "",
    ".makit-copy-button {",
    "  position: absolute;",
    "  top: 0.5rem;",
    "  right: 0.5rem;",
    "  font-size: 0.75rem;",
    "  padding: 0.25rem 0.5rem;",
    "  border-radius: var(--makit-radius);",
    "  border: 1px solid var(--makit-color-border);",
    "  background: var(--makit-color-background);",
    "  color: var(--makit-color-foreground);",
    "  cursor: pointer;",
    "}",
    "",
  ];

  for (const importPath of options.customStyleImports) {
    lines.push(`@import "${importPath}";`);
  }

  return `${lines.join("\n")}\n`;
}
