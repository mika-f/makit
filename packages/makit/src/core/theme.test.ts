import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import type { MakitConfigParsed } from "../config/schema.js";
import type { ThemeConfig } from "../types/config.js";
import type { ResolvedConfig } from "../types/resolved-config.js";
import { MakitError } from "./errors.js";
import { resolveTheme, describeThemeSlots } from "./theme.js";

/** `makit/theme`'s source entry — temp fixtures have no node_modules to resolve the package name from. */
const THEME_ENTRY = fileURLToPath(new URL("../theme.ts", import.meta.url));

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "makit-theme-"));
});

function baseConfig(theme?: ThemeConfig): ResolvedConfig {
  const parsed = { title: "Test", theme } as MakitConfigParsed;
  return resolveConfig(parsed, { root, configPath: join(root, "makit.config.ts") });
}

function write(relativePath: string, contents = "export default function C() {}\n"): string {
  const absolute = join(root, relativePath);
  mkdirSync(join(absolute, ".."), { recursive: true });
  writeFileSync(absolute, contents, "utf-8");
  return absolute;
}

async function resolve(theme?: ThemeConfig): Promise<ResolvedConfig> {
  return resolveTheme(baseConfig(theme), theme);
}

describe("resolveTheme defaults", () => {
  it("binds no slots when nothing is configured", async () => {
    const config = await resolve();
    expect(config.theme.dir).toBe("theme");
    expect(config.theme.slots).toEqual({});
    expect(config.theme.extends).toBeUndefined();
    expect(config.theme.styles).toEqual([]);
    expect(config.theme.diagnostics).toEqual([]);
  });

  it("leaves the token defaults untouched", async () => {
    const config = await resolve();
    expect(config.theme.colorScheme).toBe("system");
    expect(config.theme.radius).toBe("medium");
    expect(config.theme.accentColor).toBeUndefined();
  });
});

describe("theme.components", () => {
  it("binds a local file to a slot", async () => {
    const headerPath = write("theme-src/header.tsx");
    const config = await resolve({ components: { Header: "./theme-src/header.tsx" } });

    expect(config.theme.slots.Header).toEqual({
      filePath: headerPath,
      exportName: undefined,
      origin: "config",
      source: "./theme-src/header.tsx",
    });
  });

  it("binds a named export", async () => {
    write("theme-src/parts.tsx");
    const config = await resolve({
      components: { Footer: { from: "./theme-src/parts.tsx", export: "DocsFooter" } },
    });

    expect(config.theme.slots.Footer).toMatchObject({ exportName: "DocsFooter" });
  });

  it("registers the slot file as a Tailwind source", async () => {
    const headerPath = write("theme-src/header.tsx");
    const config = await resolve({ components: { Header: "./theme-src/header.tsx" } });

    expect(config.theme.tailwindSources).toContain(headerPath.split("\\").join("/"));
  });

  it("disables an optional slot with false", async () => {
    const config = await resolve({ components: { PrevNextLinks: false } });
    expect(config.theme.slots.PrevNextLinks).toBe(false);
  });

  it("rejects disabling a structural slot", async () => {
    await expect(resolve({ components: { DocsPage: false } })).rejects.toThrow(
      /cannot be set to false/,
    );
    await expect(resolve({ components: { DocsPage: false } })).rejects.toMatchObject({
      code: "theme-slot-not-optional",
    });
  });

  it("rejects an unknown slot name and suggests the closest one", async () => {
    const thrown = await resolve({
      components: { Heade: "./theme-src/header.tsx" } as ThemeConfig["components"],
    }).then(
      () => undefined,
      (error: unknown) => error,
    );

    expect(thrown).toBeInstanceOf(MakitError);
    const error = thrown as MakitError;
    expect(error.code).toBe("theme-unknown-slot");
    expect(error.message).toContain('Did you mean "Header"');
  });

  it("rejects a file that does not exist", async () => {
    await expect(
      resolve({ components: { Header: "./theme-src/missing.tsx" } }),
    ).rejects.toMatchObject({ code: "theme-module-not-found" });
  });

  it("rejects an uninstalled package", async () => {
    await expect(resolve({ components: { Header: "@acme/not-installed" } })).rejects.toMatchObject({
      code: "theme-module-not-found",
    });
  });
});

describe("convention directory", () => {
  it("discovers slot files by their kebab-case name", async () => {
    const headerPath = write("theme/header.tsx");
    write("theme/table-of-contents.tsx");
    const config = await resolve();

    expect(config.theme.slots.Header).toMatchObject({ filePath: headerPath, origin: "dir" });
    expect(config.theme.slots.TableOfContents).toMatchObject({ origin: "dir" });
  });

  it("ignores files that are not slot names", async () => {
    write("theme/logo.tsx");
    const config = await resolve();

    expect(config.theme.slots).toEqual({});
    expect(config.theme.diagnostics).toEqual([]);
  });

  it("warns about a file whose name is one edit away from a slot", async () => {
    write("theme/heder.tsx");
    const config = await resolve();

    expect(config.theme.slots).toEqual({});
    expect(config.theme.diagnostics).toHaveLength(1);
    expect(config.theme.diagnostics[0]).toMatchObject({ code: "theme-slot-file-ignored" });
    expect(config.theme.diagnostics[0]!.message).toContain('Did you mean "header.tsx"');
  });

  it("rejects the same slot appearing under two extensions", async () => {
    write("theme/header.tsx");
    write("theme/header.ts");

    await expect(resolve()).rejects.toMatchObject({ code: "theme-ambiguous-slot-file" });
  });

  it("lets theme.components win over a discovered file", async () => {
    write("theme/header.tsx");
    const explicit = write("custom/header.tsx");
    const config = await resolve({ components: { Header: "./custom/header.tsx" } });

    expect(config.theme.slots.Header).toMatchObject({ filePath: explicit, origin: "config" });
  });

  it("skips the scan entirely when dir is false", async () => {
    write("theme/header.tsx");
    const config = await resolve({ dir: false });

    expect(config.theme.slots).toEqual({});
    expect(config.theme.dir).toBe(false);
  });

  it("honors a custom dir", async () => {
    const headerPath = write("src/ui/header.tsx");
    const config = await resolve({ dir: "src/ui" });

    expect(config.theme.slots.Header).toMatchObject({ filePath: headerPath });
  });

  it("registers the directory as a Tailwind source", async () => {
    write("theme/header.tsx");
    const config = await resolve();

    expect(
      config.theme.tailwindSources.some((source) =>
        source.endsWith("/theme/**/*.{ts,tsx,js,jsx,mjs}"),
      ),
    ).toBe(true);
  });
});

describe("theme.extends", () => {
  function writeLocalTheme(manifest?: string): void {
    write("my-theme/index.tsx", "export function Header() {}\n");
    if (manifest) write("my-theme/makit-theme.ts", manifest);
  }

  it("resolves a local directory theme", async () => {
    writeLocalTheme();
    const config = await resolve({ extends: "./my-theme" });

    expect(config.theme.extends).toMatchObject({
      request: join(root, "my-theme", "index.tsx"),
      root: join(root, "my-theme"),
      name: "./my-theme",
    });
    expect(config.theme.packageRoots).toEqual([join(root, "my-theme")]);
  });

  it("rejects a directory without an entry file", async () => {
    mkdirSync(join(root, "empty-theme"), { recursive: true });
    await expect(resolve({ extends: "./empty-theme" })).rejects.toMatchObject({
      code: "theme-module-not-found",
    });
  });

  it("rejects a missing theme", async () => {
    await expect(resolve({ extends: "./nope" })).rejects.toMatchObject({
      code: "theme-module-not-found",
    });
    await expect(resolve({ extends: "@acme/not-installed" })).rejects.toMatchObject({
      code: "theme-module-not-found",
    });
  });

  it("loads the manifest and applies its styles and sources", async () => {
    write("my-theme/theme.css", ":root {}\n");
    writeLocalTheme(`import { defineTheme } from ${JSON.stringify(THEME_ENTRY)};
export default defineTheme({
  name: "@acme/theme",
  styles: ["./theme.css"],
  tailwindSources: ["./**/*.tsx"],
});
`);
    const config = await resolve({ extends: "./my-theme" });

    expect(config.theme.extends?.name).toBe("@acme/theme");
    expect(config.theme.styles).toEqual([join(root, "my-theme", "theme.css")]);
    expect(config.theme.tailwindSources).toContain(
      `${join(root, "my-theme").split("\\").join("/")}/**/*.tsx`,
    );
  });

  it("rejects a manifest that declares a missing stylesheet", async () => {
    writeLocalTheme(`import { defineTheme } from ${JSON.stringify(THEME_ENTRY)};
export default defineTheme({ name: "@acme/theme", styles: ["./missing.css"] });
`);
    await expect(resolve({ extends: "./my-theme" })).rejects.toMatchObject({
      code: "theme-manifest-invalid",
    });
  });

  it("rejects a manifest that did not come from defineTheme", async () => {
    writeLocalTheme(`export default { name: "@acme/theme" };\n`);
    await expect(resolve({ extends: "./my-theme" })).rejects.toMatchObject({
      code: "theme-manifest-invalid",
    });
  });

  it("applies manifest token defaults below the user's own config", async () => {
    writeLocalTheme(`import { defineTheme } from ${JSON.stringify(THEME_ENTRY)};
export default defineTheme({
  name: "@acme/theme",
  defaults: { accentColor: "#0b5cd5", radius: "none", colorScheme: "dark" },
});
`);
    const config = await resolve({ extends: "./my-theme", radius: "large" });

    // From the manifest, because the user said nothing.
    expect(config.theme.accentColor).toBe("#0b5cd5");
    expect(config.theme.colorScheme).toBe("dark");
    // The user's own value wins.
    expect(config.theme.radius).toBe("large");
  });

  it("does not also scan the theme directory when extends points at it", async () => {
    write("theme/index.tsx", "export function Header() {}\n");
    write("theme/footer.tsx");
    const config = await resolve({ extends: "./theme" });

    expect(config.theme.slots).toEqual({});
  });

  it("still applies theme.components on top of a base theme", async () => {
    writeLocalTheme();
    const headerPath = write("custom/header.tsx");
    const config = await resolve({
      extends: "./my-theme",
      components: { Header: "./custom/header.tsx" },
    });

    expect(config.theme.extends).toBeDefined();
    expect(config.theme.slots.Header).toMatchObject({ filePath: headerPath });
  });
});

describe("describeThemeSlots", () => {
  it("summarizes the base theme and each binding", async () => {
    write("theme/header.tsx");
    write("my-theme/index.tsx", "export function Header() {}\n");
    const config = await resolve({ extends: "./my-theme", components: { Footer: false } });

    const lines = describeThemeSlots(config);
    expect(lines[0]).toContain("Base theme:");
    expect(lines).toContain("Slot Footer: disabled");
    expect(lines.some((line) => line.startsWith("Slot Header:") && line.endsWith("[dir]"))).toBe(
      true,
    );
  });
});
