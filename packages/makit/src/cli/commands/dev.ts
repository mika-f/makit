import { defineCommand } from "citty";
import { loadConfig } from "../../config/load.js";
import { MakitError } from "../../core/errors.js";
import { commonArgs } from "../common-args.js";
import { createCliContext } from "../context.js";
import { handleCliError } from "../error-handler.js";

export const devCommand = defineCommand({
  meta: {
    name: "dev",
    description: "Start the development server",
  },
  args: {
    ...commonArgs,
    port: { type: "string", description: "Port to listen on (default: 3000)" },
    host: { type: "string", description: "Host to bind to (default: localhost)" },
    open: { type: "boolean", description: "Open the browser automatically" },
    "no-open": { type: "boolean", description: "Do not open the browser" },
  },
  async run({ args }) {
    const ctx = createCliContext(args);
    try {
      const config = await loadConfig({ cwd: ctx.cwd, configPath: ctx.configPath });
      ctx.logger.success(`Loaded ${config.configPath}`);
      throw new MakitError(
        "not-implemented",
        "`makit dev` is not implemented yet — the content pipeline and dev server land in a later implementation phase.",
      );
    } catch (error) {
      handleCliError(error, ctx.logger);
    }
  },
});
