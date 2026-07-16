import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { GeneratedHeading } from "../types/page.js";
import type { ResolvedConfig } from "../types/resolved-config.js";
import { resolvePackageRoot } from "./link-runtime-deps.js";

export interface CachedMarkdownResult {
  html: string;
  headings: GeneratedHeading[];
  warnings: string[];
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function getMakitVersion(): string {
  const root = resolvePackageRoot("makit");
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8")) as { version: string };
  return pkg.version;
}

/**
 * Caches the (expensive) remark/rehype/Shiki output per source file across
 * `makit` invocations (spec §29). The cache key folds in everything that
 * could change the output without the file's own content changing: the
 * Makit version, the *entire* config file's content (a simple, robust proxy
 * for "did any markdown/Shiki/theme/plugin option change" — they all live in
 * that one file), and the file's own location/locale context (since internal
 * link rewriting depends on both, not just the raw Markdown).
 */
export class BuildCache {
  private constructor(
    private readonly cacheDir: string,
    private readonly signature: string,
  ) {}

  /**
   * Returns `undefined` (caching disabled) rather than throwing if the
   * config file or Makit's own package.json can't be read — caching is a
   * pure optimization and must never be the reason a build fails.
   */
  static async create(config: ResolvedConfig): Promise<BuildCache | undefined> {
    try {
      const cacheDir = join(config.root, ".makit", "cache", "pages");
      const configContent = await readFile(config.configPath, "utf-8");
      const signature = sha256(`${getMakitVersion()}\n${configContent}`);
      return new BuildCache(cacheDir, signature);
    } catch {
      return undefined;
    }
  }

  private keyFor(
    rawContent: string,
    relativePath: string,
    localePrefix: string | undefined,
  ): string {
    return sha256(`${this.signature}\n${relativePath}\n${localePrefix ?? ""}\n${rawContent}`);
  }

  async get(
    rawContent: string,
    relativePath: string,
    localePrefix: string | undefined,
  ): Promise<CachedMarkdownResult | undefined> {
    const entryPath = join(
      this.cacheDir,
      `${this.keyFor(rawContent, relativePath, localePrefix)}.json`,
    );
    if (!existsSync(entryPath)) return undefined;
    try {
      return JSON.parse(await readFile(entryPath, "utf-8")) as CachedMarkdownResult;
    } catch {
      return undefined;
    }
  }

  async set(
    rawContent: string,
    relativePath: string,
    localePrefix: string | undefined,
    result: CachedMarkdownResult,
  ): Promise<void> {
    const entryPath = join(
      this.cacheDir,
      `${this.keyFor(rawContent, relativePath, localePrefix)}.json`,
    );
    await mkdir(this.cacheDir, { recursive: true });
    await writeFile(entryPath, JSON.stringify(result), "utf-8");
  }
}
