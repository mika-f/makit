import { defineCommand } from "citty";
import { loadConfig } from "../../config/load.js";
import { build } from "../../core/build.js";
import { commonArgs } from "../common-args.js";
import { createCliContext } from "../context.js";
import { handleCliError } from "../error-handler.js";

export const buildCommand = defineCommand({
  meta: {
    name: "build",
    description: "Build the static site for production",
  },
  args: {
    ...commonArgs,
    clean: { type: "boolean", description: "Remove outDir before building" },
    "no-clean": { type: "boolean", description: "Keep outDir contents before building" },
    strict: { type: "boolean", description: "Promote warnings to errors" },
    profile: { type: "boolean", description: "Print build performance timings" },
  },
  async run({ args }) {
    const ctx = createCliContext(args);
    try {
      const config = await loadConfig({ cwd: ctx.cwd, configPath: ctx.configPath });
      ctx.logger.success(`Loaded ${config.configPath}`);

      const started = args.profile ? performance.now() : undefined;

      const result = await build(
        config,
        {
          clean: args["no-clean"] ? false : args.clean,
          strict: args.strict,
          silent: args.silent,
        },
        ctx.logger,
      );

      ctx.logger.raw("");
      ctx.logger.success(
        `Built ${result.pageCount} page(s) (${result.fallbackCount} fallback) across ${result.localeCount} locale(s)`,
      );
      ctx.logger.raw(`Output: ${result.outDir}`);
      if (started !== undefined) {
        ctx.logger.raw(`Build time: ${((performance.now() - started) / 1000).toFixed(2)}s`);
      }
    } catch (error) {
      handleCliError(error, ctx.logger);
    }
  },
});
