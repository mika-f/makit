import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import type { ResolvedConfig } from "../../types/resolved-config.js";
import { atomicWriteFile } from "../atomic-write.js";
import { commonAncestorDir } from "../common-ancestor.js";
import {
  ALIASED_RUNTIME_PACKAGES,
  RUNTIME_PACKAGES,
  linkRuntimeDependencies,
  resolvePackageRoot,
} from "../link-runtime-deps.js";
import {
  devRefreshTemplate,
  globalsCssTemplate,
  nextConfigTemplate,
  notFoundTemplate,
  postcssConfigTemplate,
  rootLayoutTemplate,
  rootPageTemplate,
  slugPageTemplate,
  themeModuleTemplate,
} from "./templates.js";

const writeText = atomicWriteFile;

function customStyleImportPath(
  config: ResolvedConfig,
  stylesDir: string,
  styleEntry: string,
): string {
  return styleImportPath(stylesDir, join(config.root, styleEntry));
}

/** `@import` specifier for an absolute CSS path, relative to `.makit/styles`. */
function styleImportPath(stylesDir: string, absolute: string): string {
  const rel = relative(stylesDir, absolute).split(sep).join("/");
  return rel.startsWith(".") ? rel : `./${rel}`;
}

/**
 * Turbopack alias targets for the packages a theme component may import
 * (THEME §11). Paths are relative to `.makit/`, which is the Turbopack
 * project directory an alias target is resolved against.
 */
function runtimeResolveAlias(makitDir: string): Record<string, string> {
  const toTarget = (absolute: string): string => relative(makitDir, absolute).split(sep).join("/");

  const alias: Record<string, string> = {};
  for (const pkgName of ALIASED_RUNTIME_PACKAGES) {
    const root = toTarget(resolvePackageRoot(pkgName));
    alias[pkgName] = root;
    // Subpath imports (`next/link`, `react/jsx-runtime`, ...) mirror the
    // package's own layout, so one wildcard covers all of them.
    alias[`${pkgName}/*`] = `${root}/*`;
  }

  // makit-runtime's subpaths do not mirror its layout (`./slot-names` lives at
  // `dist/theme/slot-names.mjs`), so each one is aliased explicitly instead of
  // through a wildcard.
  const runtimeRoot = toTarget(resolvePackageRoot("@natsuneko-laboratory/makit-runtime"));
  alias["@natsuneko-laboratory/makit-runtime"] = runtimeRoot;
  alias["@natsuneko-laboratory/makit-runtime/client"] = `${runtimeRoot}/dist/client.mjs`;
  alias["@natsuneko-laboratory/makit-runtime/slot-names"] =
    `${runtimeRoot}/dist/theme/slot-names.mjs`;
  return alias;
}

/**
 * (Re)generates the `.makit/app` Next.js application (spec §33). `.makit/`
 * is fully reproducible — nothing here is meant to be hand-edited — but this
 * also runs while `makit dev`'s `next dev`/Turbopack child is live (on a
 * `makit.config.ts` reload), so files are written in place via
 * `atomicWriteFile` (a no-op if content is unchanged) rather than deleting
 * `.makit/app` and rewriting everything from scratch: a live dev server
 * watching these paths can otherwise observe a burst of delete+recreate
 * events for files whose content never actually changed, which is what was
 * making Turbopack's CSS pipeline flaky under rapid concurrent rebuilds.
 * The only thing actively removed is the routing structure for whichever
 * i18n mode is *not* active, since Next.js errors on conflicting routes if
 * both are left on disk (switching `i18n.enabled` still needs a `next dev`
 * restart to fully take effect either way, same as basePath/trailingSlash).
 */
export async function generateApp(config: ResolvedConfig): Promise<void> {
  const makitDir = join(config.root, ".makit");
  const appDir = join(makitDir, "app");
  const stylesDir = join(makitDir, "styles");

  await mkdir(appDir, { recursive: true });
  await rm(join(appDir, config.i18n.enabled ? "[[...slug]]" : "[locale]"), {
    recursive: true,
    force: true,
  });

  const runtimePackageRoots = RUNTIME_PACKAGES.map((pkgName) => resolvePackageRoot(pkgName));
  // Theme packages (and any slot file living outside the project) have to be
  // inside the Turbopack root too, or Turbopack misdetects the workspace root
  // (THEME §17).
  const themeRoots = [
    ...config.theme.packageRoots,
    ...Object.values(config.theme.slots)
      .filter((slot) => slot && slot.filePath)
      .map((slot) => dirname((slot as { filePath: string }).filePath)),
  ];
  const turbopackRoot = commonAncestorDir([config.root, ...runtimePackageRoots, ...themeRoots]);

  await writeText(
    join(makitDir, "next.config.mjs"),
    nextConfigTemplate(config, turbopackRoot, runtimeResolveAlias(makitDir)),
  );
  await writeText(join(makitDir, "postcss.config.mjs"), postcssConfigTemplate());

  await writeText(join(appDir, "theme.js"), themeModuleTemplate(config.theme, appDir));
  await writeText(join(appDir, "layout.js"), rootLayoutTemplate(config));
  await writeText(join(appDir, "not-found.js"), notFoundTemplate());
  // Only seeded when absent: in dev this file carries a per-regeneration
  // token (see dev.ts), and a config reload re-running generateApp must not
  // reset it — that would fire a redundant refresh on top of the one the
  // follow-up content regeneration already triggers.
  if (!existsSync(join(appDir, "dev-refresh.js"))) {
    await writeText(join(appDir, "dev-refresh.js"), devRefreshTemplate("initial"));
  }

  if (config.i18n.enabled) {
    await writeText(join(appDir, "page.js"), rootPageTemplate());
    await writeText(
      join(appDir, "[locale]", "[[...slug]]", "page.js"),
      slugPageTemplate("params.locale", "../../theme.js"),
    );
  } else {
    const singleLocale = config.i18n.locales[0]?.urlLocale ?? "en";
    await writeText(
      join(appDir, "[[...slug]]", "page.js"),
      slugPageTemplate(JSON.stringify(singleLocale), "../theme.js"),
    );
  }

  const makitRuntimeRoot =
    runtimePackageRoots[RUNTIME_PACKAGES.indexOf("@natsuneko-laboratory/makit-runtime")]!;
  const makitRuntimeDistPath = join(makitRuntimeRoot, "dist");
  const customStyleImports = config.styles.map((entry) =>
    customStyleImportPath(config, stylesDir, entry),
  );
  const themeStyleImports = config.theme.styles.map((absolute) =>
    styleImportPath(stylesDir, absolute),
  );
  await writeText(
    join(stylesDir, "globals.css"),
    globalsCssTemplate({
      makitRuntimeDistPath,
      customStyleImports,
      themeSources: config.theme.tailwindSources,
      themeStyleImports,
    }),
  );

  const publicSrcDir = join(config.root, config.publicDir);
  const publicDestDir = join(makitDir, "public");
  await rm(publicDestDir, { recursive: true, force: true });
  if (existsSync(publicSrcDir)) {
    await cp(publicSrcDir, publicDestDir, { recursive: true });
  } else {
    await mkdir(publicDestDir, { recursive: true });
  }

  await linkRuntimeDependencies(makitDir);
}
