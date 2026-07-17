import { relative, resolve } from "node:path";
import { defineCommand } from "citty";
import { installDependencies, resolvePackageManager } from "../../core/init/install.js";
import { scaffoldProject } from "../../core/init/scaffold.js";
import { getPackageVersion } from "../version.js";
import { commonArgs } from "../common-args.js";
import { createCliContext } from "../context.js";
import { handleCliError } from "../error-handler.js";

export const initCommand = defineCommand({
  meta: {
    name: "init",
    description: "Initialize a new Makit project",
  },
  args: {
    ...commonArgs,
    dir: {
      type: "positional",
      description: "Directory to create the project in",
      required: false,
      default: ".",
    },
    locale: { type: "string", description: "Initial locale (BCP-47), e.g. en-US" },
    "package-manager": {
      type: "string",
      description: "Package manager to use for install: npm | pnpm | yarn | bun",
    },
    force: { type: "boolean", description: "Overwrite existing files" },
    "skip-install": { type: "boolean", description: "Skip installing dependencies" },
    collections: {
      type: "boolean",
      description: "Scaffold a collection.makit.ts-based starter instead of a collection-less one",
    },
  },
  async run({ args }) {
    const ctx = createCliContext(args);
    try {
      const targetDir = resolve(ctx.cwd, args.dir ?? ".");
      const packageManager = resolvePackageManager(args["package-manager"], ctx.logger);

      const result = await scaffoldProject({
        targetDir,
        locale: args.locale,
        force: args.force,
        collections: args.collections,
        makitVersion: getPackageVersion(),
      });

      for (const file of result.created) {
        ctx.logger.success(`Created ${file}`);
      }

      if (result.packageJsonCreated) {
        if (args["skip-install"]) {
          ctx.logger.info(
            `Skipped dependency install. Run "${packageManager} install" when ready.`,
          );
        } else {
          ctx.logger.info(`Installing dependencies with ${packageManager}...`);
          await installDependencies(targetDir, packageManager);
          ctx.logger.success("Installed dependencies");
        }
      }

      const relativeDir = relative(ctx.cwd, targetDir);
      ctx.logger.raw("");
      ctx.logger.raw("Next steps:");
      if (relativeDir && relativeDir !== "") {
        ctx.logger.raw(`  cd ${relativeDir}`);
      }
      ctx.logger.raw("  makit dev");
    } catch (error) {
      handleCliError(error, ctx.logger);
    }
  },
});
