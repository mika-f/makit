import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

let cached: string | undefined;

/** Reads the CLI's own version from `package.json` (works from `dist/cli/`). */
export function getPackageVersion(): string {
  if (cached) return cached;
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const pkgPath = join(currentDir, "../../package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version: string };
  cached = pkg.version;
  return cached;
}
