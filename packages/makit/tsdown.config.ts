import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    adapter: "./src/adapter.ts",
    metadata: "./src/metadata/index.ts",
    "cli/index": "./src/cli/index.ts",
  },
  format: ["esm"],
  platform: "node",
  target: "node20",
  dts: true,
  clean: true,
  shims: false,
});
