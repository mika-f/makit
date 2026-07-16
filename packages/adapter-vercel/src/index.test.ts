import { describe, expect, it } from "vitest";
import type { DeploymentAdapterContext } from "@natsuneko-laboratory/makit/adapter";
import vercel from "./index.js";

describe("vercel", () => {
  it("generates a static vercel.json", async () => {
    const result = await vercel({ cleanUrls: true, trailingSlash: true }).generate({
      projectRoot: "/project",
      outDir: "/project/dist",
      config: {
        outDir: "dist",
        build: { trailingSlash: true },
        deployment: { cleanUrls: false, configFile: { mode: "generated" } },
      },
      pages: [],
      redirects: [{ from: "/old/", to: "/new/", status: 308, source: "user" }],
      headers: [{ path: "/*", headers: { "X-Test": "yes" } }],
      environment: {},
    } as unknown as DeploymentAdapterContext);
    const config = JSON.parse(result.files[0]?.content as string) as Record<string, unknown>;
    expect(config).toMatchObject({
      outputDirectory: "dist",
      framework: null,
      cleanUrls: true,
      trailingSlash: true,
    });
    expect(config.redirects).toHaveLength(1);
    expect(config.headers).toHaveLength(1);
  });
});
