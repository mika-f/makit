import { existsSync } from "node:fs";
import { join } from "node:path";
import fg from "fast-glob";
import type { ResolvedConfig, ResolvedLocaleConfig } from "../types/resolved-config.js";
import { MakitError } from "./errors.js";
import { buildRoute } from "./routes.js";
import type { Diagnostic } from "./validation.js";

export interface StaticPageSource {
  /** Static Page ID — path below `pages/` without extension or locale suffix (STATIC-PAGES §2). */
  id: string;
  /** Path below `pages/` without extension, locale suffix kept — the `static-pages.js` key. */
  componentKey: string;
  absolutePath: string;
  kind: "component" | "html";
  /** urlLocale of a locale-specific file (STATIC-PAGES §6); undefined for the shared file. */
  localeSuffix?: string;
  /** Absolute path of `<dir>/<id>.meta.ts`, when it exists. */
  metadataPath?: string;
}

export interface ScanStaticPageSourcesResult {
  sources: StaticPageSource[];
  /** `static-page-locale-metadata` warnings. */
  diagnostics: Diagnostic[];
}

/** One source chosen for one locale (STATIC-PAGES §6 resolution rules). */
export interface LocalizedStaticPageSource {
  source: StaticPageSource;
  locale: ResolvedLocaleConfig;
  /** URL segments below the locale prefix (`index` dropped). */
  segments: string[];
  route: string;
}

const PAGE_GLOB = ["**/*.{tsx,jsx,html}"];
const METADATA_GLOB = ["**/*.meta.ts"];
const METADATA_SUFFIX = ".meta.ts";

// `_`-prefixed files and directories hold helpers the pages import (STATIC-PAGES §4).
const IGNORED = ["**/node_modules/**", "**/_*/**", "**/_*"];

/** `xx-yy`-shaped, but checked only after configured locales (STATIC-PAGES §16). */
const LOCALE_SHAPED_RE = /^[a-z]{2,3}-[a-z0-9]{2,8}$/i;

const EXTENSION_RE = /\.(tsx|jsx|html)$/;

/** The absolute static pages directory, or `undefined` when disabled or absent. */
export function staticPagesDirectory(config: ResolvedConfig): string | undefined {
  if (config.staticPages.dir === false) return undefined;
  const dir = join(config.root, config.staticPages.dir);
  return existsSync(dir) ? dir : undefined;
}

interface SplitName {
  id: string;
  localeSuffix?: string;
}

/**
 * Splits a locale suffix off an extension-less path (STATIC-PAGES §6, §16):
 * a configured urlLocale is a suffix, a locale-shaped unknown one is an
 * error, and anything else stays part of the ID (`pricing.v2`).
 */
function splitLocaleSuffix(base: string, config: ResolvedConfig, sourcePath: string): SplitName {
  if (!config.i18n.enabled) return { id: base };

  const slash = base.lastIndexOf("/");
  const dot = base.lastIndexOf(".");
  if (dot <= slash + 1) return { id: base };

  const suffix = base.slice(dot + 1).toLowerCase();
  if (config.i18n.locales.some((locale) => locale.urlLocale === suffix)) {
    return { id: base.slice(0, dot), localeSuffix: suffix };
  }
  if (LOCALE_SHAPED_RE.test(suffix)) {
    throw new MakitError(
      "static-page-unknown-locale",
      `${sourcePath}: locale suffix "${suffix}" matches no configured locale (STATIC-PAGES §16).`,
    );
  }
  return { id: base };
}

/**
 * Collects the static page files under `staticPages.dir` (STATIC-PAGES §4, §6).
 * Throws `static-page-ambiguous-file` / `static-page-unknown-locale`.
 */
export async function scanStaticPageSources(
  config: ResolvedConfig,
): Promise<ScanStaticPageSourcesResult> {
  const dir = staticPagesDirectory(config);
  if (!dir) return { sources: [], diagnostics: [] };

  const [pageFiles, metadataFiles] = await Promise.all([
    fg(PAGE_GLOB, { cwd: dir, dot: false, ignore: IGNORED }),
    fg(METADATA_GLOB, { cwd: dir, dot: false, ignore: IGNORED }),
  ]);

  const diagnostics: Diagnostic[] = [];
  const sharedMetadata = new Set<string>();
  for (const relativePath of metadataFiles.sort()) {
    const absolutePath = join(dir, relativePath);
    const base = relativePath.slice(0, -METADATA_SUFFIX.length);
    const { id, localeSuffix } = splitLocaleSuffix(base, config, absolutePath);
    if (localeSuffix) {
      diagnostics.push({
        code: "static-page-locale-metadata",
        message: `Locale-specific static page metadata is ignored; put per-locale values in ${id}.meta.ts instead (STATIC-PAGES §9.1).`,
        sourcePath: absolutePath,
      });
      continue;
    }
    sharedMetadata.add(id);
  }

  const sources: StaticPageSource[] = [];
  const claimed = new Map<string, string>();
  for (const relativePath of pageFiles.sort()) {
    const absolutePath = join(dir, relativePath);
    const componentKey = relativePath.replace(EXTENSION_RE, "");
    const { id, localeSuffix } = splitLocaleSuffix(componentKey, config, absolutePath);

    const claimKey = `${id}\0${localeSuffix ?? ""}`;
    const previous = claimed.get(claimKey);
    if (previous) {
      throw new MakitError(
        "static-page-ambiguous-file",
        `${previous} and ${absolutePath} both define static page "${id}"${localeSuffix ? ` for locale "${localeSuffix}"` : ""} (STATIC-PAGES §16).`,
      );
    }
    claimed.set(claimKey, absolutePath);

    sources.push({
      id,
      componentKey,
      absolutePath,
      kind: relativePath.endsWith(".html") ? "html" : "component",
      localeSuffix,
      metadataPath: sharedMetadata.has(id) ? join(dir, `${id}${METADATA_SUFFIX}`) : undefined,
    });
  }

  return { sources, diagnostics };
}

/** URL segments for a Static Page ID — a trailing `index` is the directory itself (STATIC-PAGES §5.1). */
function segmentsForId(id: string): string[] {
  const segments = id.split("/");
  if (segments[segments.length - 1] === "index") segments.pop();
  return segments;
}

/**
 * Picks the file each locale serves for every Static Page ID (STATIC-PAGES §6):
 * a locale-specific file wins, the shared file covers the rest, and a locale
 * with neither has no such page. Ordered by ID, then by configured locale.
 */
export function resolveStaticPageLocales(
  sources: readonly StaticPageSource[],
  config: ResolvedConfig,
): LocalizedStaticPageSource[] {
  const byId = new Map<string, StaticPageSource[]>();
  for (const source of sources) {
    const list = byId.get(source.id) ?? [];
    list.push(source);
    byId.set(source.id, list);
  }

  const resolved: LocalizedStaticPageSource[] = [];
  for (const id of [...byId.keys()].sort()) {
    const candidates = byId.get(id)!;
    const segments = segmentsForId(id);
    for (const locale of config.i18n.locales) {
      const source =
        candidates.find((candidate) => candidate.localeSuffix === locale.urlLocale) ??
        candidates.find((candidate) => candidate.localeSuffix === undefined);
      if (!source) continue;
      resolved.push({
        source,
        locale,
        segments,
        route: buildRoute(segments, {
          basePath: config.basePath,
          localePrefix: config.i18n.enabled ? locale.urlLocale : undefined,
          trailingSlash: config.build.trailingSlash,
        }),
      });
    }
  }
  return resolved;
}
