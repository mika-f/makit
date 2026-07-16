import { defineCommand } from "citty";
import { loadConfig } from "../../config/load.js";
import { MakitError } from "../../core/errors.js";
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
      throw new MakitError(
        "not-implemented",
        "`makit build` is not implemented yet — the content pipeline and Next.js build land in a later implementation phase.",
      );
    } catch (error) {
      handleCliError(error, ctx.logger);
    }
  },
});
