import type { ResolvedConfig } from "../types/resolved-config.js";
import { createMetadataJiti } from "../metadata/loader.js";
import { synthesizeCollectionTopPages } from "./collection-top.js";
import { resolveCollections } from "./collections.js";
import { generateFallbackPages, populateAlternates } from "./i18n.js";
import { decoratePagesWithNavigation } from "./nav-decorate.js";
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
  const jiti = createMetadataJiti();
  const { collections, warnings: collectionWarnings } = await resolveCollections(config, jiti);
  const { pages, warnings: pipelineWarnings } = await buildAllPages(config, collections);
  const fallbackPages = generateFallbackPages(pages, config);
  const collectionTopPages = synthesizeCollectionTopPages(
    [...pages, ...fallbackPages],
    config,
    collections,
  );
  const undecoratedPages = populateAlternates(
    [...pages, ...fallbackPages, ...collectionTopPages],
    config,
  );
  const { byLocale: navigationByLocale, warnings: navigationWarnings } =
    await generateAllNavigation(undecoratedPages, config, collections, jiti);
  const { pages: allPages, diagnostics: navigationDiagnostics } = decoratePagesWithNavigation(
    undecoratedPages,
    navigationByLocale,
    config,
    collections,
  );

  const diagnostics = [
    ...navigationDiagnostics,
    ...validatePages(allPages, config, { navigationByLocale }),
  ];
  const preparedDeployment = await prepareDeploymentAdapter(config, allPages);
  const deployment = await generateDeploymentAdapter(config, preparedDeployment);
  const deploymentFiles = await writeDeploymentFiles(config, deployment.files, { check: true });

  return {
    pageCount: allPages.length,
    localeCount: config.i18n.locales.length,
    pipelineWarnings: [...collectionWarnings, ...pipelineWarnings, ...navigationWarnings],
    diagnostics,
    deploymentDiagnostics: deployment.diagnostics,
    outdatedDeploymentFiles: deploymentFiles.changed,
  };
}
