import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    // Read by the Makit CLI in plain Node (THEME §9.2), so it must stay free
    // of React — it is built as its own entry rather than re-exported.
    manifest: "./src/manifest.ts",
  },
  format: ["esm"],
  platform: "node",
  target: "node20",
  dts: true,
  clean: true,
  shims: false,
  // Bundling would collapse the per-module `"use client"` directives that
  // Next.js's RSC compiler needs at the top of each client component file
  // (THEME §9.2).
  unbundle: true,
});
