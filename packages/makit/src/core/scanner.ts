import { isAbsolute, join, relative, sep } from "node:path";
import fg from "fast-glob";
import type { ResolvedConfig, ResolvedLocaleConfig } from "../types/resolved-config.js";

export interface SourceFile {
  /** Absolute path to the markdown file. */
  absolutePath: string;
  /** Path relative to the locale's sourceDir, forward-slash separated (used for route derivation). */
  relativePath: string;
  locale: ResolvedLocaleConfig;
}

const MARKDOWN_GLOB = ["**/*.md", "**/*.markdown"];

const ALWAYS_IGNORED = ["**/node_modules/**", "**/.git/**", "**/.makit/**"];

/** An ignore glob for `outDir`, scoped to `sourceDir` — `undefined` if outDir isn't nested inside it. */
function outDirIgnoreGlob(outDirAbsolute: string, sourceDirAbsolute: string): string | undefined {
  const rel = relative(sourceDirAbsolute, outDirAbsolute);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) return undefined;
  return `${rel.split(sep).join("/")}/**`;
}

/**
 * Collects `.md`/`.markdown` files per locale's `sourceDir` (spec §13).
 * Dotfiles/dot-directories are excluded by fast-glob's default `dot: false`.
 */
export async function scanSourceFiles(config: ResolvedConfig): Promise<SourceFile[]> {
  const files: SourceFile[] = [];
  const outDirAbsolute = join(config.root, config.outDir);

  for (const locale of config.i18n.locales) {
    const sourceDirAbsolute = join(config.root, locale.sourceDir);
    const outDirIgnore = outDirIgnoreGlob(outDirAbsolute, sourceDirAbsolute);

    const matches = await fg(MARKDOWN_GLOB, {
      cwd: sourceDirAbsolute,
      absolute: true,
      dot: false,
      ignore: outDirIgnore ? [...ALWAYS_IGNORED, outDirIgnore] : ALWAYS_IGNORED,
    });

    for (const absolutePath of matches.sort()) {
      const relativePath = relative(sourceDirAbsolute, absolutePath).split(sep).join("/");
      files.push({ absolutePath, relativePath, locale });
    }
  }

  return files;
}
