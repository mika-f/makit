import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { ResolvedConfig } from "../../types/resolved-config.js";
import { atomicWriteFile } from "../atomic-write.js";
import { commonAncestorDir } from "../common-ancestor.js";
import {
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
} from "./templates.js";

const writeText = atomicWriteFile;

function customStyleImportPath(
  config: ResolvedConfig,
  stylesDir: string,
  styleEntry: string,
): string {
  const absolute = join(config.root, styleEntry);
  const rel = relative(stylesDir, absolute).split(sep).join("/");
  return rel.startsWith(".") ? rel : `./${rel}`;
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
  const turbopackRoot = commonAncestorDir([config.root, ...runtimePackageRoots]);

  await writeText(join(makitDir, "next.config.mjs"), nextConfigTemplate(config, turbopackRoot));
  await writeText(join(makitDir, "postcss.config.mjs"), postcssConfigTemplate());

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
      slugPageTemplate("params.locale"),
    );
  } else {
    const singleLocale = config.i18n.locales[0]?.urlLocale ?? "en";
    await writeText(
      join(appDir, "[[...slug]]", "page.js"),
      slugPageTemplate(JSON.stringify(singleLocale)),
    );
  }

  const makitRuntimeRoot =
    runtimePackageRoots[RUNTIME_PACKAGES.indexOf("@natsuneko-laboratory/makit-runtime")]!;
  const makitRuntimeDistPath = join(makitRuntimeRoot, "dist");
  const customStyleImports = config.styles.map((entry) =>
    customStyleImportPath(config, stylesDir, entry),
  );
  await writeText(
    join(stylesDir, "globals.css"),
    globalsCssTemplate({ makitRuntimeDistPath, customStyleImports }),
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
