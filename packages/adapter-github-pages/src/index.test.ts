import { describe, expect, it } from "vitest";
import type { DeploymentAdapterContext } from "@natsuneko-laboratory/makit/adapter";
import githubPages from "./index.js";

describe("githubPages", () => {
  it("resolves project basePath and generates Pages files", async () => {
    const adapter = githubPages({
      repository: "owner/docs",
      basePath: "auto",
      generateWorkflow: true,
      customDomain: "docs.example.com",
    });
    const resolved = await adapter.resolve({
      projectRoot: "/project",
      config: { title: "Docs" },
      environment: {},
    });
    expect(resolved.basePath).toBe("");
    expect(resolved.siteUrl).toBe("https://docs.example.com");

    const result = await adapter.generate({
      projectRoot: "/project",
      outDir: "/project/dist",
      config: { outDir: "dist", deployment: { generateCi: false } },
      pages: [],
      redirects: [],
      headers: [],
      environment: {},
    } as unknown as DeploymentAdapterContext);
    expect(result.files.map((file) => file.path)).toEqual([
      ".nojekyll",
      "CNAME",
      ".github/workflows/deploy-makit.yml",
    ]);
  });

  it("uses the repository name for project Pages", async () => {
    const resolved = await githubPages({ repository: "owner/docs", basePath: "auto" }).resolve({
      projectRoot: "/project",
      config: { title: "Docs" },
      environment: {},
    });
    expect(resolved.basePath).toBe("/docs");
    expect(resolved.siteUrl).toBe("https://owner.github.io/docs");
  });
});
