import { describe, expect, it } from "vitest";
import { resolveConfig } from "../../config/normalize.js";
import type { ResolvedThemeConfig } from "../../types/resolved-config.js";
import {
  globalsCssTemplate,
  nextConfigTemplate,
  notFoundTemplate,
  rootLayoutTemplate,
  slugPageTemplate,
  staticPagesModuleTemplate,
  themeModuleTemplate,
} from "./templates.js";
import type { GeneratedStaticPage } from "../../types/static-page.js";

const APP_DIR = "/project/.makit/app";

function themeConfig(overrides: Partial<ResolvedThemeConfig> = {}): ResolvedThemeConfig {
  return {
    colorScheme: "system",
    radius: "medium",
    breadcrumbs: { enabled: true, showHome: true, showCurrentPage: true },
    codeTheme: { light: "github-light", dark: "github-dark" },
    dir: "theme",
    slots: {},
    styles: [],
    tailwindSources: [],
    packageRoots: [],
    diagnostics: [],
    ...overrides,
  };
}

describe("rootLayoutTemplate", () => {
  it("adds production-only analytics to the generated layout", () => {
    const config = resolveConfig(
      {
        title: "Test",
        analytics: {
          googleAnalytics: { measurementId: "G-123" },
          scripts: [{ src: "https://analytics.example.com/script.js", strategy: "lazyOnload" }],
        },
      },
      { root: "/project", configPath: "/project/makit.config.ts" },
    );

    const template = rootLayoutTemplate(config);

    expect(template).toContain(
      'const analytics = {"googleAnalytics":{"measurementId":"G-123"},"scripts":[{"src":"https://analytics.example.com/script.js","strategy":"lazyOnload"}]};',
    );
    expect(template).toContain('process.env.NODE_ENV === "production"');
    expect(template).toContain("<AnalyticsScripts config={analytics} />");
  });
});

describe("themeModuleTemplate", () => {
  it("resolves to the standard theme when nothing is overridden", () => {
    const template = themeModuleTemplate(themeConfig(), APP_DIR);

    expect(template).toContain(
      'import { pickThemeSlots, resolveThemeComponents } from "@natsuneko-laboratory/makit-runtime";',
    );
    expect(template).toContain("export const themeComponents = resolveThemeComponents({});");
    expect(template).not.toContain("pickThemeSlots(baseTheme)");
  });

  it("imports a project-local slot file by a path relative to .makit/app", () => {
    const template = themeModuleTemplate(
      themeConfig({
        slots: {
          Header: {
            filePath: "/project/theme/header.tsx",
            origin: "dir",
            source: "theme/header.tsx",
          },
        },
      }),
      APP_DIR,
    );

    expect(template).toContain('import Slot0_Header from "../../theme/header.tsx";');
    expect(template).toContain("Header: Slot0_Header,");
  });

  it("imports a named export from a package", () => {
    const template = themeModuleTemplate(
      themeConfig({
        slots: {
          Footer: {
            packageSpecifier: "@acme/ui",
            exportName: "DocsFooter",
            origin: "config",
            source: "@acme/ui",
          },
        },
      }),
      APP_DIR,
    );

    expect(template).toContain('import { DocsFooter as Slot0_Footer } from "@acme/ui";');
    expect(template).toContain("Footer: Slot0_Footer,");
  });

  it("writes a disabled slot as false without importing anything", () => {
    const template = themeModuleTemplate(themeConfig({ slots: { PrevNextLinks: false } }), APP_DIR);

    expect(template).toContain("PrevNextLinks: false,");
    expect(template.split("\n").filter((line) => line.startsWith("import"))).toHaveLength(1);
  });

  it("spreads a base theme's namespace before the per-slot overrides", () => {
    const template = themeModuleTemplate(
      themeConfig({
        extends: {
          request: "@acme/makit-theme-corporate",
          root: "/project/node_modules/@acme/makit-theme-corporate",
          name: "@acme/makit-theme-corporate",
        },
        slots: {
          Header: { filePath: "/project/theme/header.tsx", origin: "dir", source: "header.tsx" },
        },
      }),
      APP_DIR,
    );

    expect(template).toContain('import * as baseTheme from "@acme/makit-theme-corporate";');
    const overrides = template.slice(template.indexOf("resolveThemeComponents("));
    expect(overrides.indexOf("...pickThemeSlots(baseTheme)")).toBeLessThan(
      overrides.indexOf("Header:"),
    );
  });

  it("imports a local base theme by relative path", () => {
    const template = themeModuleTemplate(
      themeConfig({
        extends: {
          request: "/project/my-theme/index.tsx",
          root: "/project/my-theme",
          name: "./my-theme",
        },
      }),
      APP_DIR,
    );

    expect(template).toContain('import * as baseTheme from "../../my-theme/index.tsx";');
  });
});

describe("generated entries", () => {
  it("routes the layout through the RootLayout slot", () => {
    const config = resolveConfig(
      { title: "Test" },
      { root: "/project", configPath: "/project/makit.config.ts" },
    );
    const template = rootLayoutTemplate(config);

    expect(template).toContain('import { themeComponents } from "./theme.js";');
    expect(template).toContain("const { RootLayout: Layout, ThemeVariables, ThemeScript } =");
    expect(template).toContain("bodyStart={");
    expect(template).toContain("components={themeComponents}");
  });

  it("exports the site metadata from the layout so metadataBase reaches every route", () => {
    const template = rootLayoutTemplate(
      resolveConfig(
        { title: "Test", siteUrl: "https://docs.example.com" },
        { root: "/project", configPath: "/project/makit.config.ts" },
      ),
    );

    expect(template).toContain("buildSiteMetadata, getSiteData }");
    expect(template).toContain(
      "export async function generateMetadata() {\n  return buildSiteMetadata(await getSiteData());\n}",
    );
  });

  it("lets the portal home inherit the layout's site metadata", () => {
    const template = slugPageTemplate({
      localeExpression: "params.locale",
      themeModulePath: "../../theme.js",
      staticPagesModulePath: "../../static-pages.js",
      i18nEnabled: true,
    });

    expect(template).toContain('if (entry.kind === "portal") return {};');
    expect(template).not.toContain("buildSiteMetadata");
  });

  it("passes the slot map to the page slots", () => {
    const template = slugPageTemplate({
      localeExpression: "params.locale",
      themeModulePath: "../../theme.js",
      staticPagesModulePath: "../../static-pages.js",
      i18nEnabled: true,
    });

    expect(template).toContain('import { themeComponents } from "../../theme.js";');
    expect(template).toContain("const { DocsPage } = themeComponents;");
    expect(template).toContain("components={themeComponents}");
    expect(notFoundTemplate()).toContain("<NotFoundPage components={themeComponents} />");
  });

  it("serves an unmatched path as a locale gateway when i18n is enabled", () => {
    const template = slugPageTemplate({
      localeExpression: "params.locale",
      themeModulePath: "../../theme.js",
      staticPagesModulePath: "../../static-pages.js",
      i18nEnabled: true,
    });

    expect(template).toContain("getLocaleAliasTargets");
    expect(template).toContain("const segments = [locale, ...(params.slug ?? [])];");
    expect(template).toContain("if (targets.length === 0) notFound();");
    expect(template).toContain("<RootPage behavior={i18n.root.behavior}");
    // The gateway duplicates localized pages, so it must stay out of search
    // engines (spec §35.7).
    expect(template).toContain("{ robots: { index: false, follow: false } }");
  });

  it("404s an unmatched path on a single-locale site", () => {
    const template = slugPageTemplate({
      localeExpression: '"en"',
      themeModulePath: "../theme.js",
      staticPagesModulePath: "../static-pages.js",
      i18nEnabled: false,
    });

    expect(template).not.toContain("getLocaleAliasTargets");
    expect(template).not.toContain("RootPage");
    expect(template).toContain("if (!entry) {\n    notFound();\n  }");
    expect(template).toContain("return params.map((param) => ({ slug: param.slug }));");
  });

  it("records the visitor's locale from the layout only when i18n is enabled", () => {
    const single = rootLayoutTemplate(
      resolveConfig(
        { title: "Test" },
        { root: "/project", configPath: "/project/makit.config.ts" },
      ),
    );
    const localized = rootLayoutTemplate(
      resolveConfig(
        {
          title: "Test",
          i18n: {
            defaultLocale: "en-US",
            locales: [
              { locale: "en-US", label: "English" },
              { locale: "ja-JP", label: "日本語" },
            ],
          },
        },
        { root: "/project", configPath: "/project/makit.config.ts" },
      ),
    );

    expect(single).not.toContain("LocaleMemory");
    expect(localized).toContain(
      '<LocaleMemory urlLocales={["en-us","ja-jp"]} basePath={site.basePath} />',
    );
  });
});

describe("globalsCssTemplate", () => {
  it("scans theme sources and imports theme CSS before the user's own", () => {
    const css = globalsCssTemplate({
      makitRuntimeDistPath: "/runtime/dist",
      customStyleImports: ["../../styles/custom.css"],
      themeSources: ["/project/theme/**/*.{ts,tsx}"],
      themeStyleImports: ["../../my-theme/theme.css"],
      staticPageSources: [],
    });

    expect(css).toContain('@source "/project/theme/**/*.{ts,tsx}";');
    expect(css.indexOf('@import "../../my-theme/theme.css";')).toBeLessThan(
      css.indexOf('@import "../../styles/custom.css";'),
    );
  });
});

describe("nextConfigTemplate", () => {
  it("writes the runtime resolve aliases theme components need", () => {
    const config = resolveConfig(
      { title: "Test" },
      { root: "/project", configPath: "/project/makit.config.ts" },
    );

    const template = nextConfigTemplate(config, "/project", {
      react: "../node_modules/react",
      "react/*": "../node_modules/react/*",
      "@natsuneko-laboratory/makit-runtime/client": "../node_modules/x/dist/client.mjs",
    });

    expect(template).toContain("resolveAlias: {");
    expect(template).toContain('"react": "../node_modules/react",');
    expect(template).toContain('"react/*": "../node_modules/react/*",');
    expect(template).toContain(
      '"@natsuneko-laboratory/makit-runtime/client": "../node_modules/x/dist/client.mjs",',
    );
    expect(template).toContain('root: "/project"');
  });

  it("exposes basePath to the runtime so RouteLink can strip it", () => {
    const config = resolveConfig(
      { title: "Test", basePath: "/docs" },
      { root: "/project", configPath: "/project/makit.config.ts" },
    );

    const template = nextConfigTemplate(config, "/project", {});

    expect(template).toContain('basePath: "/docs",');
    expect(template).toContain('env: { MAKIT_BASE_PATH: "/docs" },');
  });
});

function staticPage(overrides: Partial<GeneratedStaticPage>): GeneratedStaticPage {
  return {
    id: "pricing",
    route: "/pricing/",
    segments: ["pricing"],
    locale: "en",
    sourcePath: "/project/pages/pricing.tsx",
    kind: "component",
    componentKey: "pricing",
    title: "Pricing",
    layout: "default",
    search: false,
    draft: false,
    metadata: { noindex: false, nofollow: false, alternates: [] },
    ...overrides,
  };
}

describe("staticPagesModuleTemplate (STATIC-PAGES §12.3)", () => {
  it("imports each component once by a path relative to .makit/app", () => {
    const template = staticPagesModuleTemplate(
      [
        staticPage({ locale: "en-us" }),
        staticPage({ locale: "fr-fr" }),
        staticPage({
          locale: "ja-jp",
          componentKey: "pricing.ja-jp",
          sourcePath: "/project/pages/pricing.ja-jp.tsx",
        }),
        staticPage({
          id: "about",
          kind: "html",
          componentKey: undefined,
          html: "<p>a</p>",
          sourcePath: "/project/pages/about.html",
        }),
      ],
      APP_DIR,
    );

    const imports = template.split("\n").filter((line) => line.startsWith("import"));
    expect(imports).toEqual([
      'import StaticPage0 from "../../pages/pricing.tsx";',
      'import StaticPage1 from "../../pages/pricing.ja-jp.tsx";',
    ]);
    expect(template).toContain('"pricing": StaticPage0,');
    expect(template).toContain('"pricing.ja-jp": StaticPage1,');
    expect(template).not.toContain("about");
  });

  it("drops a component that is no longer a static page", () => {
    const before = staticPagesModuleTemplate(
      [
        staticPage({}),
        staticPage({ id: "new", componentKey: "new", sourcePath: "/project/pages/new.tsx" }),
      ],
      APP_DIR,
    );
    const after = staticPagesModuleTemplate([staticPage({})], APP_DIR);

    expect(before).toContain("pages/new.tsx");
    expect(after).not.toContain("pages/new.tsx");
  });

  it("exports an empty map when there are no component pages", () => {
    expect(staticPagesModuleTemplate([], APP_DIR)).toContain(
      "export const staticPageComponents = {};",
    );
  });
});

describe("slugPageTemplate static entries (STATIC-PAGES §12.3)", () => {
  const template = slugPageTemplate({
    localeExpression: "params.locale",
    themeModulePath: "../../theme.js",
    staticPagesModulePath: "../../static-pages.js",
    i18nEnabled: true,
  });

  it("imports the generated component map", () => {
    expect(template).toContain('import { staticPageComponents } from "../../static-pages.js";');
  });

  it("renders static entries through the StaticPage slot", () => {
    expect(template).toContain('entry.kind === "static"');
    expect(template).toContain("getStaticPage(locale, entry.id)");
    expect(template).toContain("staticPageComponents[page.componentKey]");
    expect(template).toContain("const { StaticPage } = themeComponents;");
    expect(template).toContain("dangerouslySetInnerHTML={{ __html: page.html }}");
  });

  it("never renders a component page through the HTML branch", () => {
    // Right after a page is added in dev, the generated JSON can name a
    // component that Turbopack has not loaded yet; that must not fall
    // through to `dangerouslySetInnerHTML` with an undefined `html`.
    expect(template).toContain('page.kind === "html"');
  });

  it("builds static page metadata", () => {
    expect(template).toContain("buildStaticPageMetadata(");
  });
});

describe("globalsCssTemplate static pages (STATIC-PAGES §12.4)", () => {
  it("scans the whole static pages directory, underscore helpers included", () => {
    const css = globalsCssTemplate({
      makitRuntimeDistPath: "/runtime/dist",
      customStyleImports: [],
      themeSources: [],
      themeStyleImports: [],
      staticPageSources: ["/project/pages/**/*.{tsx,jsx,ts,js,html}"],
    });

    expect(css).toContain('@source "/project/pages/**/*.{tsx,jsx,ts,js,html}";');
  });
});
