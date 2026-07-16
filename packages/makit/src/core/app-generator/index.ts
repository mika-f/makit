import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { ResolvedConfig } from "../../types/resolved-config.js";
import { commonAncestorDir } from "../common-ancestor.js";
import {
  RUNTIME_PACKAGES,
  linkRuntimeDependencies,
  resolvePackageRoot,
} from "../link-runtime-deps.js";
import {
  globalsCssTemplate,
  nextConfigTemplate,
  notFoundTemplate,
  postcssConfigTemplate,
  rootLayoutTemplate,
  rootPageTemplate,
  slugPageTemplate,
} from "./templates.js";

async function writeText(path: string, content: string): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, content, "utf-8");
}

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
 * (Re)generates the entire `.makit/app` Next.js application from scratch
 * (spec §33). `.makit/` is fully reproducible — nothing here is meant to be
 * hand-edited, so every file is overwritten unconditionally.
 */
export async function generateApp(config: ResolvedConfig): Promise<void> {
  const makitDir = join(config.root, ".makit");
  const appDir = join(makitDir, "app");
  const stylesDir = join(makitDir, "styles");

  await rm(appDir, { recursive: true, force: true });

  const runtimePackageRoots = RUNTIME_PACKAGES.map((pkgName) => resolvePackageRoot(pkgName));
  const turbopackRoot = commonAncestorDir([config.root, ...runtimePackageRoots]);

  await writeText(join(makitDir, "next.config.mjs"), nextConfigTemplate(config, turbopackRoot));
  await writeText(join(makitDir, "postcss.config.mjs"), postcssConfigTemplate());

  await writeText(join(appDir, "layout.js"), rootLayoutTemplate());
  await writeText(join(appDir, "not-found.js"), notFoundTemplate());

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
