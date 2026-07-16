import { rm } from "node:fs/promises";
import { join } from "node:path";
import { defineCommand } from "citty";
import { loadConfig } from "../../config/load.js";
import { commonArgs } from "../common-args.js";
import { createCliContext } from "../context.js";
import { handleCliError } from "../error-handler.js";

export const cleanCommand = defineCommand({
  meta: {
    name: "clean",
    description: "Remove generated output (.makit/ and outDir)",
  },
  args: {
    ...commonArgs,
    "cache-only": { type: "boolean", description: "Only remove .makit/cache" },
    "generated-only": { type: "boolean", description: "Only remove .makit/generated" },
    all: { type: "boolean", description: "Remove .makit/ and outDir (default behavior)" },
  },
  async run({ args }) {
    const ctx = createCliContext(args);
    try {
      const config = await loadConfig({ cwd: ctx.cwd, configPath: ctx.configPath });
      const makitDir = join(config.root, ".makit");

      const targets: string[] = [];
      if (args["cache-only"]) {
        targets.push(join(makitDir, "cache"));
      } else if (args["generated-only"]) {
        targets.push(join(makitDir, "generated"));
      } else {
        targets.push(makitDir, join(config.root, config.outDir));
      }

      for (const target of targets) {
        await rm(target, { recursive: true, force: true });
        ctx.logger.success(`Removed ${target}`);
      }
    } catch (error) {
      handleCliError(error, ctx.logger);
    }
  },
});
