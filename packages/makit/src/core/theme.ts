import { existsSync, readdirSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve as resolvePath, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createJiti } from "jiti";
import {
  THEME_SLOT_NAMES,
  THEME_SLOT_NAME_BY_FILE_NAME,
  isOptionalThemeSlotName,
  isThemeSlotName,
  type ThemeSlotName,
} from "@natsuneko-laboratory/makit-runtime/slot-names";
import { THEME_SLOT_EXTENSIONS } from "../config/defaults.js";
import { isThemeManifest } from "../theme.js";
import type { ThemeConfig } from "../types/config.js";
import type { ThemeComponentRef, ThemeManifest } from "../types/theme.js";
import type {
  ResolvedConfig,
  ResolvedConfigDiagnostic,
  ResolvedThemeExtends,
  ResolvedThemeSlot,
} from "../types/resolved-config.js";
import { MakitError } from "./errors.js";

/** Default Tailwind scan globs for a theme that ships no manifest (THEME §9.4). */
const DEFAULT_PACKAGE_TAILWIND_SOURCES = ["**/*.{js,mjs,jsx}"];
const DEFAULT_LOCAL_TAILWIND_SOURCES = ["**/*.{ts,tsx,js,jsx,mjs}"];

/** Manifest file names looked for inside a local (directory) theme (THEME §9.3). */
const LOCAL_MANIFEST_BASENAMES = [
  "makit-theme.ts",
  "makit-theme.mts",
  "makit-theme.js",
  "makit-theme.mjs",
];
/** Entry file names looked for inside a local (directory) theme (THEME §7.1). */
const LOCAL_ENTRY_BASENAMES = ["index.tsx", "index.jsx", "index.ts", "index.js", "index.mjs"];

function isRelativeSpecifier(specifier: string): boolean {
  return specifier.startsWith("./") || specifier.startsWith("../") || specifier === ".";
}

function isPathSpecifier(specifier: string): boolean {
  return isRelativeSpecifier(specifier) || isAbsolute(specifier);
}

/** Splits `@scope/name/sub/path` into its package name and the rest. */
function splitPackageSpecifier(specifier: string): { name: string; subpath: string } {
  const segments = specifier.split("/");
  const nameSegments = specifier.startsWith("@") ? segments.slice(0, 2) : segments.slice(0, 1);
  const name = nameSegments.join("/");
  const rest = segments.slice(nameSegments.length).join("/");
  return { name, subpath: rest };
}

/** Levenshtein distance, capped for short slot names (THEME §15.2). */
function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  let previous = Array.from({ length: cols }, (_, index) => index);
  for (let row = 1; row < rows; row++) {
    const current = [row];
    for (let col = 1; col < cols; col++) {
      current[col] = Math.min(
        previous[col]! + 1,
        current[col - 1]! + 1,
        previous[col - 1]! + (a[row - 1] === b[col - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[cols - 1]!;
}

function suggestSlotName(value: string): ThemeSlotName | undefined {
  let best: { slot: ThemeSlotName; distance: number } | undefined;
  const lowered = value.toLowerCase();
  for (const slot of THEME_SLOT_NAMES) {
    const distance = editDistance(lowered, slot.toLowerCase());
    if (distance <= 2 && (!best || distance < best.distance)) best = { slot, distance };
  }
  return best?.slot;
}

/** Resolver bound to the *project*, so user dependencies resolve from there rather than from makit's own tree. */
function createProjectResolver(root: string) {
  const parentURL = pathToFileURL(join(root, "makit.config.ts")).href;
  const jiti = createJiti(parentURL, { moduleCache: false });
  return {
    /** Absolute path a specifier resolves to, or `undefined` when unresolvable. */
    resolve(specifier: string): string | undefined {
      const resolved = jiti.esmResolve(specifier, { parentURL, try: true });
      if (!resolved) return undefined;
      return resolved.startsWith("file:") ? fileURLToPath(resolved) : undefined;
    },
    async load(specifier: string): Promise<unknown> {
      return jiti.import(specifier, { default: true, parentURL });
    },
  };
}

type ProjectResolver = ReturnType<typeof createProjectResolver>;

function firstExistingFile(dir: string, basenames: readonly string[]): string | undefined {
  for (const basename of basenames) {
    const candidate = join(dir, basename);
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

/** Walks up from `filePath` to the nearest directory containing a package.json. */
function packageRootOf(filePath: string): string | undefined {
  let dir = filePath;
  for (;;) {
    const parent = resolvePath(dir, "..");
    if (parent === dir) return undefined;
    dir = parent;
    if (existsSync(join(dir, "package.json"))) return dir;
  }
}

function normalizeRef(ref: ThemeComponentRef): { from: string; exportName?: string } | false {
  if (ref === false) return false;
  if (typeof ref === "string") return { from: ref };
  return { from: ref.from, exportName: ref.export };
}

function resolveSlotRef(
  slot: ThemeSlotName,
  ref: ThemeComponentRef,
  config: ResolvedConfig,
  resolver: ProjectResolver,
  diagnostics: ResolvedConfigDiagnostic[],
): ResolvedThemeSlot | false {
  const normalized = normalizeRef(ref);
  if (normalized === false) {
    if (!isOptionalThemeSlotName(slot)) {
      throw new MakitError(
        "theme-slot-not-optional",
        `"${slot}" cannot be set to false because the page layout requires it. ` +
          `Configured in: theme.components.${slot}`,
      );
    }
    return false;
  }

  const { from, exportName } = normalized;

  if (isPathSpecifier(from)) {
    const filePath = isAbsolute(from) ? from : resolvePath(config.root, from);
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      throw new MakitError(
        "theme-module-not-found",
        `Could not resolve the theme component "${from}" for slot "${slot}".\n` +
          `  Configured in: theme.components.${slot}\n` +
          `  Resolved to:   ${filePath}`,
      );
    }
    if (relative(config.root, filePath).startsWith("..")) {
      diagnostics.push({
        code: "theme-outside-project",
        message:
          `Theme component for slot "${slot}" resolves outside the project root ` +
          `(${filePath}). The generated app still builds, but the Turbopack root has to be ` +
          `widened to cover it, which makes the build less portable.`,
        sourcePath: config.configPath,
      });
    }
    return { filePath, exportName, origin: "config", source: from };
  }

  if (!resolver.resolve(from)) {
    throw new MakitError(
      "theme-module-not-found",
      `Could not resolve the theme component package "${from}" for slot "${slot}".\n` +
        `  Configured in: theme.components.${slot}\n` +
        `  Is it installed in ${config.root}?`,
    );
  }
  return { packageSpecifier: from, exportName, origin: "config", source: from };
}

/** Loads a theme's optional `./makit-theme` manifest (THEME §9.3). */
async function loadManifest(
  specifier: string,
  themeRoot: string,
  isLocal: boolean,
  resolver: ProjectResolver,
): Promise<ThemeManifest | undefined> {
  const request = isLocal
    ? firstExistingFile(themeRoot, LOCAL_MANIFEST_BASENAMES)
    : resolver.resolve(`${specifier}/makit-theme`) && `${specifier}/makit-theme`;
  if (!request) return undefined;

  let value: unknown;
  try {
    value = await resolver.load(isLocal ? pathToFileURL(request).href : request);
  } catch (error) {
    // The cause is the actionable half here (a missing dependency, a syntax
    // error), and `handleCliError` only logs causes in verbose mode.
    const reason = error instanceof Error ? error.message : String(error);
    throw new MakitError(
      "theme-manifest-invalid",
      `Failed to load the theme manifest for "${specifier}" (${request}).\n  ${reason}`,
      { cause: error },
    );
  }

  if (value instanceof Promise) {
    throw new MakitError(
      "theme-manifest-invalid",
      `The theme manifest for "${specifier}" default-exports a Promise. Manifests must be synchronous (THEME §9.3).`,
    );
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new MakitError(
      "theme-manifest-invalid",
      `The theme manifest for "${specifier}" (${request}) must default-export an object created by defineTheme().`,
    );
  }
  const manifest = value as ThemeManifest;
  if (typeof manifest.name !== "string" || manifest.name.length === 0) {
    throw new MakitError(
      "theme-manifest-invalid",
      `The theme manifest for "${specifier}" (${request}) is missing a "name".`,
    );
  }
  if (!isThemeManifest(manifest)) {
    throw new MakitError(
      "theme-manifest-invalid",
      `The theme manifest for "${specifier}" (${request}) was not created by defineTheme(). ` +
        `Wrap the default export in defineTheme() from "@natsuneko-laboratory/makit/theme".`,
    );
  }
  return manifest;
}

/** Resolves `theme.extends` into an import request, a root directory, and its manifest (THEME §7.1). */
async function resolveExtends(
  specifier: string,
  config: ResolvedConfig,
  resolver: ProjectResolver,
): Promise<ResolvedThemeExtends> {
  if (isPathSpecifier(specifier)) {
    const themeRoot = isAbsolute(specifier) ? specifier : resolvePath(config.root, specifier);
    if (!existsSync(themeRoot)) {
      throw new MakitError(
        "theme-module-not-found",
        `Could not resolve the theme "${specifier}".\n` +
          `  Configured in: theme.extends\n` +
          `  Resolved to:   ${themeRoot}`,
      );
    }
    const entry = statSync(themeRoot).isDirectory()
      ? firstExistingFile(themeRoot, LOCAL_ENTRY_BASENAMES)
      : themeRoot;
    if (!entry) {
      throw new MakitError(
        "theme-module-not-found",
        `The local theme directory "${specifier}" (${themeRoot}) has no entry file. ` +
          `Add one of: ${LOCAL_ENTRY_BASENAMES.join(", ")}.`,
      );
    }
    const root = statSync(themeRoot).isDirectory() ? themeRoot : resolvePath(themeRoot, "..");
    const manifest = await loadManifest(specifier, root, true, resolver);
    return { request: entry, root, name: manifest?.name ?? specifier, manifest };
  }

  const entryPath = resolver.resolve(specifier);
  if (!entryPath) {
    throw new MakitError(
      "theme-module-not-found",
      `Could not resolve the theme package "${specifier}".\n` +
        `  Configured in: theme.extends\n` +
        `  Is it installed in ${config.root}?`,
    );
  }
  const { name } = splitPackageSpecifier(specifier);
  const root = packageRootOf(entryPath);
  if (!root) {
    throw new MakitError(
      "theme-module-not-found",
      `Could not locate the package root of the theme "${specifier}" above ${entryPath}.`,
    );
  }
  const manifest = await loadManifest(name, root, false, resolver);
  return { request: specifier, root, name: manifest?.name ?? specifier, manifest };
}

/** Scans the convention directory for slot files (THEME §8). */
function discoverSlotDir(
  themeDir: string,
  diagnostics: ResolvedConfigDiagnostic[],
): Partial<Record<ThemeSlotName, ResolvedThemeSlot>> {
  const discovered: Partial<Record<ThemeSlotName, ResolvedThemeSlot>> = {};
  if (!existsSync(themeDir) || !statSync(themeDir).isDirectory()) return discovered;

  for (const [fileName, slot] of Object.entries(THEME_SLOT_NAME_BY_FILE_NAME)) {
    const matches = THEME_SLOT_EXTENSIONS.map((extension) =>
      join(themeDir, `${fileName}${extension}`),
    ).filter((candidate) => existsSync(candidate));
    if (matches.length === 0) continue;
    if (matches.length > 1) {
      throw new MakitError(
        "theme-ambiguous-slot-file",
        `The "${slot}" slot matches more than one file in ${themeDir}:\n` +
          matches.map((match) => `  ${match}`).join("\n") +
          `\nKeep exactly one.`,
      );
    }
    discovered[slot] = {
      filePath: matches[0]!,
      origin: "dir",
      source: matches[0]!,
    };
  }

  warnOnMisspelledSlotFiles(themeDir, diagnostics);
  return discovered;
}

/**
 * Files whose name is one edit away from a slot's file name are almost
 * certainly typos, and silently ignoring them is the worst outcome — a theme
 * that simply never applies (THEME §15.2). Unrelated names are helper modules
 * and stay silent.
 */
function warnOnMisspelledSlotFiles(
  themeDir: string,
  diagnostics: ResolvedConfigDiagnostic[],
): void {
  const knownFileNames = new Set(Object.keys(THEME_SLOT_NAME_BY_FILE_NAME));
  const entries = readDirSafe(themeDir);
  for (const entry of entries) {
    const extension = THEME_SLOT_EXTENSIONS.find((candidate) => entry.endsWith(candidate));
    if (!extension) continue;
    const base = entry.slice(0, -extension.length);
    if (knownFileNames.has(base)) continue;
    for (const fileName of knownFileNames) {
      if (editDistance(base, fileName) > 1) continue;
      diagnostics.push({
        code: "theme-slot-file-ignored",
        message:
          `"${entry}" in ${themeDir} does not match any theme slot and is ignored. ` +
          `Did you mean "${fileName}${extension}" (the ${THEME_SLOT_NAME_BY_FILE_NAME[fileName]!} slot)?`,
        sourcePath: join(themeDir, entry),
      });
      break;
    }
  }
}

function readDirSafe(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

function toGlobPath(root: string, pattern: string): string {
  const normalized = pattern.replace(/^\.\//, "");
  return `${root.split(sep).join("/")}/${normalized}`;
}

/**
 * Second, async half of config resolution for `theme` (THEME §7.5): binds
 * every slot to a concrete module, resolves `theme.extends` and its manifest,
 * and applies the manifest's token defaults underneath the user's own.
 *
 * Kept out of `resolveConfig` because it touches the filesystem and evaluates
 * the theme's manifest, and it needs the raw (pre-defaults) theme config to
 * tell "the user chose this value" from "this is just the default".
 */
export async function resolveTheme(
  config: ResolvedConfig,
  rawTheme: ThemeConfig | undefined,
): Promise<ResolvedConfig> {
  const diagnostics: ResolvedConfigDiagnostic[] = [];
  const resolver = createProjectResolver(config.root);

  const base = rawTheme?.extends
    ? await resolveExtends(rawTheme.extends, config, resolver)
    : undefined;

  const themeDirSetting = config.theme.dir;
  // A local `extends` pointing at the same directory owns it as a theme
  // package; scanning it again for individual slots would double-bind them.
  const themeDir =
    themeDirSetting === false
      ? undefined
      : (() => {
          const absolute = resolvePath(config.root, themeDirSetting);
          return base && base.root === absolute ? undefined : absolute;
        })();

  const slots: Partial<Record<ThemeSlotName, ResolvedThemeSlot | false>> = themeDir
    ? discoverSlotDir(themeDir, diagnostics)
    : {};

  for (const [name, ref] of Object.entries(rawTheme?.components ?? {})) {
    if (!isThemeSlotName(name)) {
      const suggestion = suggestSlotName(name);
      throw new MakitError(
        "theme-unknown-slot",
        `"${name}" is not a theme slot.\n` +
          `  Configured in: theme.components.${name}` +
          (suggestion ? `\n  Did you mean "${suggestion}"?` : ""),
      );
    }
    if (ref === undefined) continue;
    slots[name] = resolveSlotRef(name, ref, config, resolver, diagnostics);
  }

  const styles: string[] = [];
  const tailwindSources: string[] = [];
  const packageRoots: string[] = [];

  if (base) {
    packageRoots.push(base.root);
    for (const style of base.manifest?.styles ?? []) {
      const stylePath = resolvePath(base.root, style);
      if (!existsSync(stylePath)) {
        throw new MakitError(
          "theme-manifest-invalid",
          `The theme "${base.name}" declares a stylesheet that does not exist: ${stylePath}`,
        );
      }
      styles.push(stylePath);
    }
    const isLocal = isPathSpecifier(base.request);
    const patterns =
      base.manifest?.tailwindSources ??
      (isLocal ? DEFAULT_LOCAL_TAILWIND_SOURCES : DEFAULT_PACKAGE_TAILWIND_SOURCES);
    for (const pattern of patterns) tailwindSources.push(toGlobPath(base.root, pattern));
  }

  if (themeDir && existsSync(themeDir)) {
    for (const pattern of DEFAULT_LOCAL_TAILWIND_SOURCES) {
      tailwindSources.push(toGlobPath(themeDir, pattern));
    }
  }

  for (const slot of Object.values(slots)) {
    if (!slot) continue;
    if (slot.filePath) {
      tailwindSources.push(slot.filePath.split(sep).join("/"));
      continue;
    }
    if (!slot.packageSpecifier) continue;
    const entryPath = resolver.resolve(slot.packageSpecifier);
    const root = entryPath ? packageRootOf(entryPath) : undefined;
    if (!root) continue;
    packageRoots.push(root);
    for (const pattern of DEFAULT_PACKAGE_TAILWIND_SOURCES) {
      tailwindSources.push(toGlobPath(root, pattern));
    }
  }

  const manifestDefaults = base?.manifest?.defaults;
  const codeTheme =
    rawTheme?.codeTheme === undefined && manifestDefaults?.codeTheme !== undefined
      ? typeof manifestDefaults.codeTheme === "string"
        ? { light: manifestDefaults.codeTheme, dark: manifestDefaults.codeTheme }
        : manifestDefaults.codeTheme
      : config.theme.codeTheme;

  return {
    ...config,
    theme: {
      ...config.theme,
      // Manifest defaults sit between Makit's defaults and the user's config
      // (THEME §9.4), so they only apply where the user said nothing.
      colorScheme:
        rawTheme?.colorScheme ?? manifestDefaults?.colorScheme ?? config.theme.colorScheme,
      accentColor: rawTheme?.accentColor ?? manifestDefaults?.accentColor ?? undefined,
      radius: rawTheme?.radius ?? manifestDefaults?.radius ?? config.theme.radius,
      codeTheme,
      dir: themeDirSetting,
      extends: base,
      slots,
      styles,
      tailwindSources: [...new Set(tailwindSources)],
      packageRoots: [...new Set(packageRoots)],
      diagnostics,
    },
  };
}

/** Human-readable summary of where each overridden slot came from, for `makit build`/`check` logs. */
export function describeThemeSlots(config: ResolvedConfig): string[] {
  const lines: string[] = [];
  if (config.theme.extends) lines.push(`Base theme: ${config.theme.extends.name}`);
  for (const slot of THEME_SLOT_NAMES) {
    const binding = config.theme.slots[slot];
    if (binding === undefined) continue;
    if (binding === false) {
      lines.push(`Slot ${slot}: disabled`);
      continue;
    }
    const target = binding.filePath ?? binding.packageSpecifier ?? binding.source;
    const exportName = binding.exportName ? ` (${binding.exportName})` : "";
    lines.push(`Slot ${slot}: ${target}${exportName} [${binding.origin}]`);
  }
  return lines;
}
