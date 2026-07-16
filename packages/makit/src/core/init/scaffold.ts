import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { MakitError } from "../errors.js";
import {
  gitignoreRequiredEntries,
  gitignoreTemplate,
  indexMarkdownTemplate,
  makitConfigTemplate,
  packageJsonTemplate,
} from "./templates.js";

export interface ScaffoldOptions {
  targetDir: string;
  locale?: string;
  force?: boolean;
  makitVersion: string;
}

export interface ScaffoldResult {
  /** Paths written or updated, relative to `targetDir`, in the order they were processed. */
  created: string[];
  /** True if a new `package.json` was written (a signal that install should run). */
  packageJsonCreated: boolean;
}

function toPackageName(dirName: string): string {
  const slug = dirName
    .toLowerCase()
    .replace(/[^a-z0-9-~]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "my-documentation";
}

/**
 * Writes a new Makit project into `targetDir`. Files that would silently
 * discard existing user content (`makit.config.ts`, `docs/index.md`) require
 * `force` to overwrite; `.gitignore` is merged additively and `package.json`
 * is only created when absent (spec §9.2).
 */
export async function scaffoldProject(options: ScaffoldOptions): Promise<ScaffoldResult> {
  const { targetDir, force = false, makitVersion } = options;
  const lang = options.locale ?? "en";
  const title = toDisplayTitle(basename(targetDir));

  const configPath = join(targetDir, "makit.config.ts");
  const docsIndexPath = join(targetDir, "docs", "index.md");

  if (!force) {
    const conflicts = [configPath, docsIndexPath].filter((path) => existsSync(path));
    if (conflicts.length > 0) {
      throw new MakitError(
        "project-exists",
        `Refusing to overwrite existing file(s) without --force:\n${conflicts.map((c) => `  ${c}`).join("\n")}`,
      );
    }
  }

  const created: string[] = [];

  await mkdir(targetDir, { recursive: true });
  await mkdir(join(targetDir, "docs"), { recursive: true });
  await mkdir(join(targetDir, "public"), { recursive: true });

  await writeFile(configPath, makitConfigTemplate(title, lang), "utf-8");
  created.push("makit.config.ts");

  await writeFile(docsIndexPath, indexMarkdownTemplate(title), "utf-8");
  created.push("docs/index.md");

  const publicGitkeepPath = join(targetDir, "public", ".gitkeep");
  if (!existsSync(publicGitkeepPath)) {
    await writeFile(publicGitkeepPath, "", "utf-8");
    created.push("public/.gitkeep");
  }

  await mergeGitignore(targetDir);
  created.push(".gitignore");

  const packageJsonPath = join(targetDir, "package.json");
  const packageJsonCreated = !existsSync(packageJsonPath);
  if (packageJsonCreated) {
    await writeFile(
      packageJsonPath,
      packageJsonTemplate(toPackageName(basename(targetDir)), makitVersion),
      "utf-8",
    );
    created.push("package.json");
  }

  return { created, packageJsonCreated };
}

function toDisplayTitle(dirName: string): string {
  if (dirName === "." || dirName === "" || dirName === "/") return "My Documentation";
  return dirName
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

async function mergeGitignore(targetDir: string): Promise<void> {
  const gitignorePath = join(targetDir, ".gitignore");
  if (!existsSync(gitignorePath)) {
    await writeFile(gitignorePath, gitignoreTemplate(), "utf-8");
    return;
  }

  const existing = await readFile(gitignorePath, "utf-8");
  const existingLines = new Set(existing.split("\n").map((line) => line.trim()));
  const missing = gitignoreRequiredEntries().filter((entry) => !existingLines.has(entry));
  if (missing.length === 0) return;

  const separator = existing.endsWith("\n") ? "" : "\n";
  await writeFile(gitignorePath, `${existing}${separator}${missing.join("\n")}\n`, "utf-8");
}
