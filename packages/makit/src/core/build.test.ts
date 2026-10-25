import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import { cleanBuildOutput } from "./build.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "makit-build-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function touch(relativePath: string): Promise<void> {
  const fullPath = join(dir, relativePath);
  await mkdir(join(fullPath, ".."), { recursive: true });
  await writeFile(fullPath, "x", "utf-8");
}

async function exists(relativePath: string): Promise<boolean> {
  return access(join(dir, relativePath)).then(
    () => true,
    () => false,
  );
}

describe("cleanBuildOutput", () => {
  it("removes outDir and the Next.js build cache, keeping makit caches", async () => {
    const config = resolveConfig(
      { title: "Test" },
      { root: dir, configPath: join(dir, "makit.config.ts") },
    );
    await touch(join(config.outDir, "index.html"));
    await touch(".makit/.next/cache/styles.css");
    await touch(".makit/out/index.html");
    await touch(".makit/cache/metadata/entry.json");

    await cleanBuildOutput(config);

    expect(await exists(config.outDir)).toBe(false);
    expect(await exists(".makit/.next")).toBe(false);
    expect(await exists(".makit/out")).toBe(false);
    expect(await exists(".makit/cache/metadata/entry.json")).toBe(true);
  });

  it("is a no-op when nothing has been built yet", async () => {
    const config = resolveConfig(
      { title: "Test" },
      { root: dir, configPath: join(dir, "makit.config.ts") },
    );
    await expect(cleanBuildOutput(config)).resolves.toBeUndefined();
  });
});
