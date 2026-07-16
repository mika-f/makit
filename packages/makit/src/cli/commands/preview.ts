import { existsSync } from "node:fs";
import { join } from "node:path";
import { defineCommand } from "citty";
import { loadConfig } from "../../config/load.js";
import { MakitError } from "../../core/errors.js";
import { openBrowser } from "../../core/open-browser.js";
import { startPreviewServer } from "../../core/preview.js";
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
      const outDirAbsolute = join(config.root, config.outDir);

      if (!existsSync(outDirAbsolute)) {
        throw new MakitError(
          "output-write-failed",
          `"${config.outDir}" does not exist yet. Run \`makit build\` first.`,
        );
      }

      const port = args.port ? Number.parseInt(args.port, 10) : config.preview.port;
      const host = args.host ?? config.preview.host;
      const open = args.open ?? config.preview.open;

      const server = await startPreviewServer(config, { port, host });
      ctx.logger.success(`Serving ${config.outDir} at ${server.url}`);

      if (open) openBrowser(server.url);

      process.once("SIGINT", () => {
        ctx.logger.info("Shutting down...");
        server.close().then(() => process.exit(0));
      });
    } catch (error) {
      handleCliError(error, ctx.logger);
    }
  },
});
