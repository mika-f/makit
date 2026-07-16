import type { ResolvedConfig } from "../types/resolved-config.js";
import { generateFallbackPages, populateAlternates } from "./i18n.js";
import { generateAllNavigation } from "./navigation.js";
import { buildAllPages } from "./pages.js";
import type { Diagnostic } from "./validation.js";
import { validatePages } from "./validation.js";
import type { DeploymentDiagnostic } from "../types/adapter.js";
import {
  generateDeploymentAdapter,
  prepareDeploymentAdapter,
  writeDeploymentFiles,
} from "./deployment.js";

export interface CheckResult {
  pageCount: number;
  localeCount: number;
  /** Plain pipeline warnings (e.g. unknown code languages) — no diagnostic code. */
  pipelineWarnings: string[];
  /** Typed, code-bearing diagnostics from document-level validation (spec §31.2). */
  diagnostics: Diagnostic[];
  deploymentDiagnostics: DeploymentDiagnostic[];
  outdatedDeploymentFiles: string[];
}

/**
 * Runs the full validation pipeline without building (spec §9.7): scan,
 * process Markdown, resolve i18n fallbacks/alternates, generate navigation,
 * then validate links/anchors/images/titles/SEO/navigation coverage/
 * translation coverage. Duplicate routes/page ids are already enforced by
 * `buildAllPages`/`generateFallbackPages` and surface as thrown `MakitError`s.
 */
export async function check(config: ResolvedConfig): Promise<CheckResult> {
  const { pages, warnings: pipelineWarnings } = await buildAllPages(config);
  const fallbackPages = generateFallbackPages(pages, config);
  const allPages = populateAlternates([...pages, ...fallbackPages], config);
  const { byLocale: navigationByLocale, warnings: navigationWarnings } = generateAllNavigation(
    allPages,
    config,
  );

  const diagnostics = validatePages(allPages, config, { navigationByLocale });
  const preparedDeployment = await prepareDeploymentAdapter(config, allPages);
  const deployment = await generateDeploymentAdapter(config, preparedDeployment);
  const deploymentFiles = await writeDeploymentFiles(config, deployment.files, { check: true });

  return {
    pageCount: allPages.length,
    localeCount: config.i18n.locales.length,
    pipelineWarnings: [...pipelineWarnings, ...navigationWarnings],
    diagnostics,
    deploymentDiagnostics: deployment.diagnostics,
    outdatedDeploymentFiles: deploymentFiles.changed,
  };
}
