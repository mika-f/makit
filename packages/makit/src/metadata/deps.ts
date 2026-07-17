import { readFile, realpath } from "node:fs/promises";
import { pathToFileURL, fileURLToPath } from "node:url";
import { relative, isAbsolute } from "node:path";
import { init as esModuleLexerInit, parse as parseModule } from "es-module-lexer";
import type { Jiti } from "jiti";

export type MetadataWarningCode = "env-var-in-metadata" | "out-of-project-import";

export interface MetadataWarning {
  code: MetadataWarningCode;
  message: string;
  /** Absolute path of the file the warning was raised for. */
  file: string;
}

export interface DependencyScanResult {
  /** Absolute paths of local files (transitively) imported by the metadata file. */
  dependencies: string[];
  warnings: MetadataWarning[];
}

/**
 * Collects the local import graph of a metadata file by statically scanning
 * import specifiers (spec §19, §22, §43 — imported local files participate
 * in watching and cache keys).
 *
 * Static scanning is exact for metadata files: dynamic `import()` is already
 * ruled out by the synchronous-evaluation constraint (spec §20). Bare
 * (package) specifiers are ignored; only relative imports are followed.
 */
export async function scanDependencies(
  entryPath: string,
  jiti: Jiti,
  projectRoot: string,
): Promise<DependencyScanResult> {
  await esModuleLexerInit;

  // Resolution returns real paths (e.g. /private/var on macOS), so compare
  // against real paths to avoid misclassifying symlinked roots as external.
  const realProjectRoot = await realpath(projectRoot).catch(() => projectRoot);
  const realEntryPath = await realpath(entryPath).catch(() => entryPath);

  const dependencies: string[] = [];
  const warnings: MetadataWarning[] = [];
  const visited = new Set<string>([realEntryPath]);

  async function visit(filePath: string, isEntry: boolean): Promise<void> {
    let source: string;
    try {
      source = await readFile(filePath, "utf8");
    } catch {
      return;
    }

    if (source.includes("process.env")) {
      warnings.push({
        code: "env-var-in-metadata",
        message:
          `${filePath} depends on process.env. ` +
          "Metadata output may differ between environments.",
        file: filePath,
      });
    }

    for (const specifier of extractImportSpecifiers(source)) {
      if (!specifier.startsWith("./") && !specifier.startsWith("../")) continue;

      let resolved: string;
      try {
        resolved = fileURLToPath(
          jiti.esmResolve(specifier, { parentURL: pathToFileURL(filePath).href }),
        );
      } catch {
        // Unresolvable imports surface as evaluation errors from the loader;
        // nothing useful to track here.
        continue;
      }

      if (visited.has(resolved)) continue;
      visited.add(resolved);
      dependencies.push(resolved);

      if (isOutsideProject(resolved, realProjectRoot)) {
        warnings.push({
          code: "out-of-project-import",
          message: `${isEntry ? entryPath : filePath} imports ${resolved}, which is outside the project root.`,
          file: resolved,
        });
        continue;
      }

      await visit(resolved, false);
    }
  }

  await visit(realEntryPath, true);
  return { dependencies, warnings };
}

function isOutsideProject(filePath: string, projectRoot: string): boolean {
  const rel = relative(projectRoot, filePath);
  return rel.startsWith("..") || isAbsolute(rel);
}

function extractImportSpecifiers(source: string): string[] {
  try {
    const [imports] = parseModule(source);
    return imports.map((entry) => entry.n).filter((n): n is string => typeof n === "string");
  } catch {
    // es-module-lexer can reject TypeScript-only syntax; fall back to a
    // conservative regex over import/export-from statements.
    const specifiers: string[] = [];
    const pattern = /(?:import|export)\s[^"'`;]*?from\s*["']([^"']+)["']|import\s*["']([^"']+)["']/g;
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1] ?? match[2];
      if (specifier) specifiers.push(specifier);
    }
    return specifiers;
  }
}
