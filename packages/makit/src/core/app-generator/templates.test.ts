import { describe, expect, it } from "vitest";
import { resolveConfig } from "../../config/normalize.js";
import type { ResolvedThemeConfig } from "../../types/resolved-config.js";
import {
  globalsCssTemplate,
  nextConfigTemplate,
  notFoundTemplate,
  rootLayoutTemplate,
  slugPageTemplate,
  themeModuleTemplate,
} from "./templates.js";

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

  it("passes the slot map to the page slots", () => {
    const template = slugPageTemplate("params.locale", "../../theme.js");

    expect(template).toContain('import { themeComponents } from "../../theme.js";');
    expect(template).toContain("const { DocsPage } = themeComponents;");
    expect(template).toContain("components={themeComponents}");
    expect(notFoundTemplate()).toContain("<NotFoundPage components={themeComponents} />");
  });
});

describe("globalsCssTemplate", () => {
  it("scans theme sources and imports theme CSS before the user's own", () => {
    const css = globalsCssTemplate({
      makitRuntimeDistPath: "/runtime/dist",
      customStyleImports: ["../../styles/custom.css"],
      themeSources: ["/project/theme/**/*.{ts,tsx}"],
      themeStyleImports: ["../../my-theme/theme.css"],
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
});
