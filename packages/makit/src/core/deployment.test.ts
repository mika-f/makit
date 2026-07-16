import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import type { DeploymentAdapter } from "../types/adapter.js";
import type { GeneratedPage } from "../types/page.js";
import {
  createDeploymentModels,
  resolveDeployment,
  runDeploymentAdapter,
  writeDeploymentFiles,
} from "./deployment.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "makit-deployment-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function adapter(overrides: Partial<DeploymentAdapter> = {}): DeploymentAdapter {
  return {
    name: "test-adapter",
    capabilities: {
      nativeRedirects: true,
      conditionalRedirects: true,
      customHeaders: true,
      custom404: true,
      basePath: true,
      customDomainFile: false,
      generatedCi: false,
      edgeRuntime: false,
    },
    async resolve() {
      return {};
    },
    async validate() {
      return [];
    },
    async generate() {
      return { files: [], warnings: [] };
    },
    ...overrides,
  };
}

function configWith(deploymentAdapter?: DeploymentAdapter) {
  return resolveConfig(
    {
      title: "Docs",
      deployment: {
        adapter: deploymentAdapter,
        headers: true,
      },
      redirects: [{ from: "/old/", to: "/new/", status: 308 }],
    },
    { root, configPath: join(root, "makit.config.ts") },
  );
}

describe("deployment adapter pipeline", () => {
  it("applies resolve results before page generation", async () => {
    const config = configWith(
      adapter({
        async resolve() {
          return { basePath: "docs/", outDir: "public", trailingSlash: false };
        },
      }),
    );

    const resolved = await resolveDeployment(config);
    expect(resolved.basePath).toBe("/docs");
    expect(resolved.outDir).toBe("public");
    expect(resolved.build.trailingSlash).toBe(false);
  });

  it("creates common redirects and opt-in standard security headers", () => {
    const models = createDeploymentModels(configWith());
    expect(models.redirects).toEqual([
      expect.objectContaining({ from: "/old/", to: "/new/", source: "user" }),
    ]);
    expect(models.headers).toEqual([
      {
        path: "/*",
        headers: {
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        },
      },
    ]);
  });

  it("runs validate before generate and rejects adapter errors", async () => {
    let generated = false;
    const config = configWith(
      adapter({
        async validate() {
          return [{ level: "error", code: "test.invalid", message: "Invalid deployment" }];
        },
        async generate() {
          generated = true;
          return { files: [], warnings: [] };
        },
      }),
    );

    await expect(runDeploymentAdapter(config, [] as GeneratedPage[])).rejects.toThrow(
      "Invalid deployment",
    );
    expect(generated).toBe(false);
  });

  it("writes generated files and detects stale files in check mode", async () => {
    const config = configWith();
    const files = [
      {
        path: "adapter.json",
        content: "expected\n",
        destination: "project-root" as const,
        overwrite: true,
      },
    ];
    const first = await writeDeploymentFiles(config, files);
    expect(first.changed).toEqual(["adapter.json"]);
    expect(await readFile(join(root, "adapter.json"), "utf8")).toBe("expected\n");

    await writeFile(join(root, "adapter.json"), "old\n");
    const check = await writeDeploymentFiles(config, files, { check: true });
    expect(check.changed).toEqual(["adapter.json"]);
    expect(await readFile(join(root, "adapter.json"), "utf8")).toBe("old\n");
  });

  it("rejects generated paths that escape their destination", async () => {
    const config = configWith();
    await expect(
      writeDeploymentFiles(config, [
        {
          path: "../secret",
          content: "nope",
          destination: "output-directory",
          overwrite: true,
        },
      ]),
    ).rejects.toThrow("outside output-directory");
  });
});
