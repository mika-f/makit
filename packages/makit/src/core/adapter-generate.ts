import type { ResolvedConfig } from "../types/resolved-config.js";
import type { DeploymentRunResult, WriteDeploymentResult } from "./deployment.js";
import { runDeploymentAdapter, writeDeploymentFiles } from "./deployment.js";
import { generateFallbackPages, populateAlternates } from "./i18n.js";
import { buildAllPages } from "./pages.js";

export interface GenerateAdapterOptions {
  check?: boolean;
  dryRun?: boolean;
  force?: boolean;
}

export interface GenerateAdapterResult {
  deployment: DeploymentRunResult;
  files: WriteDeploymentResult;
}

export async function generateAdapterFiles(
  config: ResolvedConfig,
  options: GenerateAdapterOptions = {},
): Promise<GenerateAdapterResult> {
  const { pages } = await buildAllPages(config);
  const productionPages = pages.filter((page) => !page.draft);
  const fallbackPages = generateFallbackPages(productionPages, config);
  const allPages = populateAlternates([...productionPages, ...fallbackPages], config);
  const deployment = await runDeploymentAdapter(config, allPages);
  const files = await writeDeploymentFiles(config, deployment.files, options);
  return { deployment, files };
}
