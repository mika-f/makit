import { existsSync } from "node:fs";
import { isAbsolute, join, relative, sep } from "node:path";
import fg from "fast-glob";
import type { ResolvedConfig, ResolvedLocaleConfig } from "../types/resolved-config.js";
import type { ResolvedCollection } from "./collections.js";

export interface SourceFile {
  /** Absolute path to the markdown file. */
  absolutePath: string;
  /** Path relative to the collection's directory for this locale, forward-slash separated (used for route derivation). */
  relativePath: string;
  /** Absolute path of the sibling `{filename}.meta.ts`, when one exists (spec §9.1). */
  metadataPath?: string;
  locale: ResolvedLocaleConfig;
  collection: ResolvedCollection;
}

const MARKDOWN_GLOB = ["**/*.md", "**/*.markdown"];

const MARKDOWN_EXTENSION_RE = /\.(md|markdown)$/i;

const ALWAYS_IGNORED = ["**/node_modules/**", "**/.git/**", "**/.makit/**"];

/** The sibling `.meta.ts` path for a markdown file — `github-pages.md` → `github-pages.meta.ts` (spec §9.1). */
export function metadataPathFor(markdownAbsolutePath: string): string {
  return markdownAbsolutePath.replace(MARKDOWN_EXTENSION_RE, ".meta.ts");
}

/** An ignore glob for a directory nested inside `baseDir` — `undefined` if it isn't nested. */
function nestedIgnoreGlob(targetAbsolute: string, baseAbsolute: string): string | undefined {
  const rel = relative(baseAbsolute, targetAbsolute);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) return undefined;
  return `${rel.split(sep).join("/")}/**`;
}

/**
 * Collects `.md`/`.markdown` files per (locale, collection) directory
 * (spec §8). For an implicit collection the directory is the locale's whole
 * sourceDir; sibling collection directories are excluded so files are never
 * scanned into two collections. Dotfiles/dot-directories are excluded by
 * fast-glob's default `dot: false`.
 */
export async function scanSourceFiles(
  config: ResolvedConfig,
  collections: readonly ResolvedCollection[],
): Promise<SourceFile[]> {
  const files: SourceFile[] = [];
  const outDirAbsolute = join(config.root, config.outDir);

  for (const collection of collections) {
    for (const locale of config.i18n.locales) {
      const collectionLocale = collection.locales[locale.urlLocale];
      if (!collectionLocale) continue;

      const baseDir = collectionLocale.dir;
      const ignore = [...ALWAYS_IGNORED];

      const outDirIgnore = nestedIgnoreGlob(outDirAbsolute, baseDir);
      if (outDirIgnore) ignore.push(outDirIgnore);

      // Keep sibling collections' content out of this collection's scan
      // (only relevant when collection dirs nest inside another's dir,
      // e.g. the implicit whole-sourceDir case never coexists, but explicit
      // setups could point two collections at overlapping trees).
      for (const other of collections) {
        if (other.id === collection.id) continue;
        const otherLocale = other.locales[locale.urlLocale];
        if (!otherLocale) continue;
        const otherIgnore = nestedIgnoreGlob(otherLocale.dir, baseDir);
        if (otherIgnore) ignore.push(otherIgnore);
      }

      const matches = await fg(MARKDOWN_GLOB, {
        cwd: baseDir,
        absolute: true,
        dot: false,
        ignore,
      });

      for (const absolutePath of matches.sort()) {
        const relativePath = relative(baseDir, absolutePath).split(sep).join("/");
        const candidateMetadataPath = metadataPathFor(absolutePath);
        files.push({
          absolutePath,
          relativePath,
          metadataPath: existsSync(candidateMetadataPath) ? candidateMetadataPath : undefined,
          locale,
          collection,
        });
      }
    }
  }

  return files;
}
