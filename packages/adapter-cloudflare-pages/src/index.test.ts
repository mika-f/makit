import { describe, expect, it } from "vitest";
import type { DeploymentAdapterContext } from "makit/adapter";
import cloudflarePages from "./index.js";

const context = {
  projectRoot: "/project",
  outDir: "/project/dist",
  config: { outDir: "dist", deployment: { cleanUrls: false }, build: { trailingSlash: true } },
  pages: [],
  redirects: [{ from: "/old/", to: "/new/", status: 308, source: "user" }],
  headers: [{ path: "/*", headers: { "X-Test": "yes" } }],
  environment: {},
} as unknown as DeploymentAdapterContext;

describe("cloudflarePages", () => {
  it("generates native redirect and header files", async () => {
    const result = await cloudflarePages().generate(context);
    expect(result.files.map((file) => file.path)).toEqual(["_redirects", "_headers"]);
    expect(result.files[0]?.content).toContain("/old/ /new/ 308");
    expect(result.files[1]?.content).toContain("X-Test: yes");
  });
});
