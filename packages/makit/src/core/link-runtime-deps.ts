import { existsSync } from "node:fs";
import { lstat, mkdir, readlink, rm, symlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MakitError } from "./errors.js";

/**
 * Packages `.makit/app` needs at build/dev time. All are declared as regular
 * dependencies of the `makit` package itself, so they're guaranteed
 * resolvable from here regardless of which package manager (npm/pnpm/yarn/
 * bun) the user installed `makit` with.
 */
export const RUNTIME_PACKAGES = [
  "next",
  "react",
  "react-dom",
  "lucide-react",
  "@natsuneko-laboratory/makit-runtime",
  "tailwindcss",
  "@tailwindcss/postcss",
  "@tailwindcss/typography",
] as const;

/**
 * Resolves a package's root directory. Doesn't rely on the package exposing
 * `./package.json` in its `exports` map (many don't, e.g. `@tailwindcss/postcss`)
 * — instead resolves the package's normal entry point and walks up to the
 * nearest `package.json`, which works for any conventionally-laid-out package.
 */
export function resolvePackageRoot(pkgName: string): string {
  let entryUrl: string;
  try {
    entryUrl = import.meta.resolve(pkgName);
  } catch (error) {
    throw new MakitError(
      "output-write-failed",
      `Could not resolve the "${pkgName}" package required by \`.makit/\`. Is your project's dependency install corrupted or incomplete?`,
      { cause: error },
    );
  }

  let dir = dirname(fileURLToPath(entryUrl));
  while (!existsSync(join(dir, "package.json"))) {
    const parent = dirname(dir);
    if (parent === dir) {
      throw new MakitError(
        "output-write-failed",
        `Could not locate package.json for "${pkgName}" above ${entryUrl}`,
      );
    }
    dir = parent;
  }
  return dir;
}

async function currentLinkTarget(linkPath: string): Promise<string | undefined> {
  try {
    if (!(await lstat(linkPath)).isSymbolicLink()) return undefined;
    return await readlink(linkPath);
  } catch {
    return undefined;
  }
}

/**
 * Symlinks each Next.js runtime dependency into `.makit/node_modules/`,
 * resolved from makit's own dependency tree (rather than relying on ambient
 * hoisting into the user's project root, which pnpm's strict node_modules
 * layout does not guarantee). This makes `.makit/app`'s own module
 * resolution work the same way under npm, pnpm, yarn, and bun.
 *
 * Runs on every `makit dev` config reload as well as at startup, so leaves
 * an already-correct link untouched rather than unconditionally
 * unlinking + relinking it — `tailwindcss`/`@tailwindcss/postcss` are live
 * dependencies of the running `next dev`/Turbopack process, and swapping
 * their module path out from under it for no reason is asking for trouble.
 */
export async function linkRuntimeDependencies(makitDir: string): Promise<void> {
  const nodeModulesDir = join(makitDir, "node_modules");
  await mkdir(nodeModulesDir, { recursive: true });

  for (const pkgName of RUNTIME_PACKAGES) {
    const targetDir = resolvePackageRoot(pkgName);
    const linkPath = join(nodeModulesDir, ...pkgName.split("/"));

    if ((await currentLinkTarget(linkPath)) === targetDir) continue;

    await mkdir(dirname(linkPath), { recursive: true });
    await rm(linkPath, { recursive: true, force: true });

    try {
      await symlink(targetDir, linkPath, "junction");
    } catch (error) {
      throw new MakitError(
        "output-write-failed",
        `Failed to link runtime dependency "${pkgName}" into ${nodeModulesDir}`,
        { cause: error },
      );
    }
  }
}
