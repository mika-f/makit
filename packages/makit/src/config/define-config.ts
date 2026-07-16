import type { MakitConfig } from "../types/config.js";

/**
 * Identity helper that gives `makit.config.ts` type checking and editor
 * autocompletion. Performs no validation — that happens when the config
 * is loaded by the CLI (see `config/load.ts`).
 */
export function defineConfig(config: MakitConfig): MakitConfig {
  return config;
}
