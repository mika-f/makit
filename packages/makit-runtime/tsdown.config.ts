import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "./src/index.ts",
  },
  format: ["esm"],
  platform: "node",
  target: "node20",
  dts: true,
  clean: true,
  shims: false,
  // Bundling everything into one file loses per-module "use client" directives
  // (Next.js's RSC compiler needs them at the top of each client-component
  // file); mirroring the source layout keeps each one intact.
  unbundle: true,
});
