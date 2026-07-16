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
  return `import { getLocalesData, getManifest, getSiteData, RootPage } from "@natsuneko-laboratory/makit-runtime";

export default async function Page() {
  const [i18n, manifest, site] = await Promise.all([getLocalesData(), getManifest(), getSiteData()]);

  const defaultLocaleConfig = i18n.locales.find((locale) => locale.locale === i18n.defaultLocale);
  const defaultEntry = manifest.pages.find(
    (page) => page.locale === defaultLocaleConfig?.urlLocale && page.segments.length === 0,
  );
  const defaultHref = defaultEntry?.route ?? \`\${site.basePath}/\`;

  const locales = i18n.locales.map((locale) => {
    const entry = manifest.pages.find((page) => page.locale === locale.urlLocale && page.segments.length === 0);
    return {
      locale: locale.locale,
      urlLocale: locale.urlLocale,
      label: locale.label,
      href: entry?.route ?? defaultHref,
    };
  });

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
  buildPageMetadata,
  getAllStaticParams,
  getLocalesData,
  getNavigation,
  getPageForRoute,
  getSiteData,
} from "@natsuneko-laboratory/makit-runtime";

export async function generateStaticParams() {
  ${localeExpression === "params.locale" ? "return getAllStaticParams();" : "const params = await getAllStaticParams();\n  return params.map((param) => ({ slug: param.slug }));"}
}

export async function generateMetadata({ params }) {
  params = await params;
  const locale = ${localeExpression};
  const page = await getPageForRoute(locale, params.slug ?? []);
  if (!page) return {};
  const site = await getSiteData();
  return buildPageMetadata(page, site);
}

export default async function Page({ params }) {
  params = await params;
  const locale = ${localeExpression};
  const page = await getPageForRoute(locale, params.slug ?? []);
  if (!page) notFound();

  const [site, i18n, navigation] = await Promise.all([getSiteData(), getLocalesData(), getNavigation(locale)]);

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
    '@import "tailwindcss";',
    '@plugin "@tailwindcss/typography";',
    "",
    '@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));',
    `@source "${options.makitRuntimeDistPath}/**/*.js";`,
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
