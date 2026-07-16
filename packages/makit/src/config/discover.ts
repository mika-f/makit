import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { MakitError } from "../core/errors.js";
import { CONFIG_FILE_CANDIDATES } from "./defaults.js";

/**
 * Resolves the config file to load.
 *
 * When `explicitPath` (the `--config` CLI flag) is given, it is used as-is
 * and must exist. Otherwise, candidates are searched in priority order
 * (spec §10); finding more than one is treated as an ambiguous project
 * setup and rejected rather than silently picking one.
 */
export function discoverConfigFile(cwd: string, explicitPath?: string): string {
  if (explicitPath) {
    const resolved = isAbsolute(explicitPath) ? explicitPath : join(cwd, explicitPath);
    if (!existsSync(resolved)) {
      throw new MakitError("config-not-found", `Config file not found: ${resolved}`);
    }
    return resolved;
  }

  const found = CONFIG_FILE_CANDIDATES.filter((name) => existsSync(join(cwd, name)));

  if (found.length === 0) {
    throw new MakitError(
      "config-not-found",
      `No Makit config file found in ${cwd}.\nExpected one of: ${CONFIG_FILE_CANDIDATES.join(", ")}`,
    );
  }

  if (found.length > 1) {
    throw new MakitError(
      "config-ambiguous",
      `Multiple Makit config files found in ${cwd}: ${found.join(", ")}.\nKeep only one.`,
    );
  }

  return join(cwd, found[0]!);
}
