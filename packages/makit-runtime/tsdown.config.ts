import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    // Exposed on its own so the Makit CLI can read the slot list in plain
    // Node, without pulling React or Next.js in (THEME §7.6).
    "theme/slot-names": "./src/theme/slot-names.ts",
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
