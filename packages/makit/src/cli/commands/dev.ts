import { defineCommand } from "citty";
import { loadConfig } from "../../config/load.js";
import { startDevServer } from "../../core/dev.js";
import { openBrowser } from "../../core/open-browser.js";
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

      const port = args.port ? Number.parseInt(args.port, 10) : config.dev.port;
      const host = args.host ?? config.dev.host;
      const open = args["no-open"] ? false : (args.open ?? config.dev.open);

      const server = await startDevServer(config, { port, host }, ctx.logger);
      const url = `http://${host}:${port}${config.basePath}/`;
      ctx.logger.success(`Dev server running at ${url}`);

      if (open) openBrowser(url);

      process.once("SIGINT", () => {
        ctx.logger.info("Shutting down...");
        server.close().then(() => process.exit(0));
      });
    } catch (error) {
      handleCliError(error, ctx.logger);
    }
  },
});
