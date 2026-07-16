import { defineCommand } from "citty";
import { loadConfig } from "../../config/load.js";
import { EXIT_CODE } from "../../core/exit-code.js";
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
      ctx.logger.info(`Found ${config.i18n.locales.length} locale(s)`);
      // Document-level validation (front matter, duplicate routes/ids, broken
      // links, navigation, translations, code languages, SEO) is implemented
      // in a later phase; only configuration is validated so far.
      ctx.logger.warn(
        "Document validation (links, routes, navigation, front matter) is not implemented yet — only the config file was validated.",
      );
    } catch (error) {
      handleCliError(error, ctx.logger);
      if (process.exitCode === EXIT_CODE.ERROR) {
        process.exitCode = EXIT_CODE.VALIDATION_FAILED;
      }
    }
  },
});
