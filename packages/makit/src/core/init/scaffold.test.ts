import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MakitError } from "../errors.js";
import { scaffoldProject } from "./scaffold.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "makit-scaffold-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("scaffoldProject", () => {
  it("writes the expected files", async () => {
    const result = await scaffoldProject({ targetDir: dir, makitVersion: "0.1.0" });

    expect(existsSync(join(dir, "makit.config.ts"))).toBe(true);
    expect(existsSync(join(dir, "docs", "index.md"))).toBe(true);
    expect(existsSync(join(dir, "public", ".gitkeep"))).toBe(true);
    expect(existsSync(join(dir, ".gitignore"))).toBe(true);
    expect(existsSync(join(dir, "package.json"))).toBe(true);
    expect(result.packageJsonCreated).toBe(true);
  });

  it("defaults lang to en when no locale is given", async () => {
    await scaffoldProject({ targetDir: dir, makitVersion: "0.1.0" });
    const config = await readFile(join(dir, "makit.config.ts"), "utf-8");
    expect(config).toContain('lang: "en"');
  });

  it("uses the given locale for lang", async () => {
    await scaffoldProject({ targetDir: dir, locale: "ja-JP", makitVersion: "0.1.0" });
    const config = await readFile(join(dir, "makit.config.ts"), "utf-8");
    expect(config).toContain('lang: "ja-JP"');
  });

  it("refuses to overwrite an existing config without force", async () => {
    await scaffoldProject({ targetDir: dir, makitVersion: "0.1.0" });
    await expect(scaffoldProject({ targetDir: dir, makitVersion: "0.1.0" })).rejects.toThrow(
      MakitError,
    );
  });

  it("overwrites existing files when force is set", async () => {
    await scaffoldProject({ targetDir: dir, makitVersion: "0.1.0" });
    await expect(
      scaffoldProject({ targetDir: dir, force: true, makitVersion: "0.1.0" }),
    ).resolves.toBeDefined();
  });

  it("does not recreate package.json if one already exists", async () => {
    await writeFile(join(dir, "package.json"), JSON.stringify({ name: "existing" }), "utf-8");
    const result = await scaffoldProject({ targetDir: dir, makitVersion: "0.1.0" });
    expect(result.packageJsonCreated).toBe(false);
    const content = await readFile(join(dir, "package.json"), "utf-8");
    expect(content).toContain("existing");
  });

  it("merges required entries into an existing .gitignore instead of overwriting it", async () => {
    await writeFile(join(dir, ".gitignore"), "my-custom-entry/\n", "utf-8");
    await scaffoldProject({ targetDir: dir, makitVersion: "0.1.0" });
    const content = await readFile(join(dir, ".gitignore"), "utf-8");
    expect(content).toContain("my-custom-entry/");
    expect(content).toContain(".makit/");
    expect(content).toContain("dist/");
  });

  it("is idempotent when merging .gitignore twice", async () => {
    await scaffoldProject({ targetDir: dir, makitVersion: "0.1.0" });
    await scaffoldProject({ targetDir: dir, force: true, makitVersion: "0.1.0" });
    const content = await readFile(join(dir, ".gitignore"), "utf-8");
    expect(content.match(/\.makit\//g)).toHaveLength(1);
  });
});
