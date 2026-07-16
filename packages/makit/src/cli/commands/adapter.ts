import { defineCommand } from "citty";
import { loadConfig } from "../../config/load.js";
import { generateAdapterFiles } from "../../core/adapter-generate.js";
import { MakitError } from "../../core/errors.js";
import { EXIT_CODE } from "../../core/exit-code.js";
import { commonArgs } from "../common-args.js";
import { createCliContext } from "../context.js";
import { handleCliError } from "../error-handler.js";

const generateCommand = defineCommand({
  meta: {
    name: "generate",
    description: "Generate deployment adapter files",
  },
  args: {
    ...commonArgs,
    force: { type: "boolean", description: "Overwrite files that are not marked as overwriteable" },
    "dry-run": { type: "boolean", description: "Show files that would change without writing" },
    check: { type: "boolean", description: "Fail when generated files are out of date" },
  },
  async run({ args }) {
    const ctx = createCliContext(args);
    try {
      if (args.check && args["dry-run"]) {
        throw new MakitError("config-invalid", "--check and --dry-run cannot be used together.");
      }
      const config = await loadConfig({ cwd: ctx.cwd, configPath: ctx.configPath });
      if (!config.deployment.adapter) {
        throw new MakitError("adapter-not-configured", "No deployment adapter is configured.");
      }
      ctx.logger.success(`Deployment adapter: ${config.deployment.adapter.name}`);
      const result = await generateAdapterFiles(config, {
        check: args.check,
        dryRun: args["dry-run"],
        force: args.force,
      });
      for (const diagnostic of result.deployment.diagnostics) {
        if (diagnostic.level === "warning") ctx.logger.warn(diagnostic.message, diagnostic.code);
        else ctx.logger.info(diagnostic.message);
      }
      for (const path of result.files.changed) {
        if (args.check) ctx.logger.error(`Outdated: ${path}`, "adapter-files-outdated");
        else if (args["dry-run"]) ctx.logger.info(`Would generate ${path}`);
        else ctx.logger.success(`Generated ${path}`);
      }
      for (const path of result.files.unchanged) ctx.logger.info(`Unchanged ${path}`);
      for (const path of result.files.skipped) ctx.logger.info(`Manual deployment file: ${path}`);
      if (args.check && result.files.changed.length > 0) {
        process.exitCode = EXIT_CODE.VALIDATION_FAILED;
      }
    } catch (error) {
      handleCliError(error, ctx.logger);
      if (args.check && process.exitCode === EXIT_CODE.ERROR) {
        process.exitCode = EXIT_CODE.VALIDATION_FAILED;
      }
    }
  },
});

export const adapterCommand = defineCommand({
  meta: {
    name: "adapter",
    description: "Manage deployment adapter files",
  },
  subCommands: {
    generate: generateCommand,
  },
});
