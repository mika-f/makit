import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { DeploymentAdapterContext } from "makit/adapter";
import netlify from "./index.js";

let root: string | undefined;
afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

describe("netlify", () => {
  it("generates netlify.toml with redirects and headers", async () => {
    root = await mkdtemp(join(tmpdir(), "makit-netlify-"));
    const result = await netlify().generate({
      projectRoot: root,
      outDir: join(root, "dist"),
      config: {
        outDir: "dist",
        deployment: { configFile: { mode: "generated" } },
      },
      pages: [],
      redirects: [{ from: "/old/", to: "/new/", status: 308, source: "user" }],
      headers: [{ path: "/*", headers: { "X-Test": "yes" } }],
      environment: {},
    } as unknown as DeploymentAdapterContext);
    expect(result.files).toHaveLength(1);
    expect(result.files[0]?.path).toBe("netlify.toml");
    expect(result.files[0]?.content).toContain("[[redirects]]");
    expect(result.files[0]?.content).toContain("[[headers]]");
  });
});
