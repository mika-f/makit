import { dirname, resolve as resolvePath } from "node:path";
import { createJiti } from "jiti";
import { MakitConfigError, MakitError } from "../core/errors.js";
import { resolveDeployment } from "../core/deployment.js";
import type { ResolvedConfig } from "../types/resolved-config.js";
import { discoverConfigFile } from "./discover.js";
import { resolveConfig } from "./normalize.js";
import { makitConfigSchema } from "./schema.js";

export interface LoadConfigOptions {
  /** Project root to search for a config file in. Defaults to `process.cwd()`. */
  cwd?: string;
  /** Explicit config file path (the `--config` CLI flag). Bypasses discovery. */
  configPath?: string;
}

export async function loadConfig(options: LoadConfigOptions = {}): Promise<ResolvedConfig> {
  const cwd = options.cwd ? resolvePath(options.cwd) : process.cwd();
  const configPath = discoverConfigFile(cwd, options.configPath);

  const jiti = createJiti(import.meta.url, {
    interopDefault: true,
    // Config may change between CLI invocations (dev server config reloads);
    // disable the in-process module cache so re-loading a changed file works.
    moduleCache: false,
  });

  let mod: unknown;
  try {
    mod = await jiti.import(configPath, { default: true });
  } catch (error) {
    throw new MakitError("config-load-failed", `Failed to load config file: ${configPath}`, {
      cause: error,
    });
  }

  const parseResult = makitConfigSchema.safeParse(mod);
  if (!parseResult.success) {
    throw MakitConfigError.fromZodError(parseResult.error, configPath);
  }

  const config = resolveConfig(parseResult.data, {
    root: dirname(configPath),
    configPath,
  });
  return resolveDeployment(config);
}
