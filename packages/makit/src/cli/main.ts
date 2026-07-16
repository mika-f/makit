import { defineCommand } from "citty";
import { buildCommand } from "./commands/build.js";
import { adapterCommand } from "./commands/adapter.js";
import { checkCommand } from "./commands/check.js";
import { cleanCommand } from "./commands/clean.js";
import { devCommand } from "./commands/dev.js";
import { initCommand } from "./commands/init.js";
import { previewCommand } from "./commands/preview.js";
import { getPackageVersion } from "./version.js";

export const mainCommand = defineCommand({
  meta: {
    name: "makit",
    version: getPackageVersion(),
    description: "Generate static documentation sites from Markdown, powered by Next.js.",
  },
  subCommands: {
    adapter: adapterCommand,
    init: initCommand,
    dev: devCommand,
    build: buildCommand,
    preview: previewCommand,
    clean: cleanCommand,
    check: checkCommand,
  },
});
