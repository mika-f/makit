import { defineCommand } from "citty";
import { loadConfig } from "../../config/load.js";
import { check } from "../../core/check.js";
import { EXIT_CODE } from "../../core/exit-code.js";
import { selectPromotedDiagnostics } from "../../core/validation.js";
import { commonArgs } from "../common-args.js";
import { createCliContext } from "../context.js";
import { handleCliError } from "../error-handler.js";

export const checkCommand = defineCommand({
  meta: {
    name: "check",
    description: "Validate configuration and documentation without building",
  },
  args: {
    ...commonArgs,
  },
  async run({ args }) {
    const ctx = createCliContext(args);
    try {
      const config = await loadConfig({ cwd: ctx.cwd, configPath: ctx.configPath });
      ctx.logger.success(`Loaded ${config.configPath}`);

      const result = await check(config);
      ctx.logger.info(`Found ${result.pageCount} page(s) across ${result.localeCount} locale(s)`);

      for (const warning of result.pipelineWarnings) {
        ctx.logger.warn(warning);
      }
      for (const diagnostic of result.diagnostics) {
        ctx.logger.warn(
          diagnostic.sourcePath
            ? `${diagnostic.sourcePath}: ${diagnostic.message}`
            : diagnostic.message,
          diagnostic.code,
        );
      }

      const promoted = selectPromotedDiagnostics(result.diagnostics, config.validation);
      const strictPipelineFailure = config.validation.strict && result.pipelineWarnings.length > 0;

      if (promoted.length > 0 || strictPipelineFailure) {
        ctx.logger.error(
          `${promoted.length + (strictPipelineFailure ? result.pipelineWarnings.length : 0)} warning(s) promoted to errors (validation.strict/failOn)`,
        );
        process.exitCode = EXIT_CODE.VALIDATION_FAILED;
        return;
      }

      ctx.logger.success(
        `No issues found (${result.pipelineWarnings.length + result.diagnostics.length} warning(s))`,
      );
    } catch (error) {
      handleCliError(error, ctx.logger);
      if (process.exitCode === EXIT_CODE.ERROR) {
        process.exitCode = EXIT_CODE.VALIDATION_FAILED;
      }
    }
  },
});
