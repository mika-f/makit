import { defineCommand } from "citty";
import { loadConfig } from "../../config/load.js";
import { MakitError } from "../../core/errors.js";
import { commonArgs } from "../common-args.js";
import { createCliContext } from "../context.js";
import { handleCliError } from "../error-handler.js";

export const previewCommand = defineCommand({
  meta: {
    name: "preview",
    description: "Serve the built static site locally",
  },
  args: {
    ...commonArgs,
    port: { type: "string", description: "Port to listen on (default: 3000)" },
    host: { type: "string", description: "Host to bind to (default: localhost)" },
    open: { type: "boolean", description: "Open the browser automatically" },
  },
  async run({ args }) {
    const ctx = createCliContext(args);
    try {
      const config = await loadConfig({ cwd: ctx.cwd, configPath: ctx.configPath });
      ctx.logger.success(`Loaded ${config.configPath}`);
      throw new MakitError(
        "not-implemented",
        `\`makit preview\` is not implemented yet — it will serve "${config.outDir}" once \`makit build\` exists.`,
      );
    } catch (error) {
      handleCliError(error, ctx.logger);
    }
  },
});
