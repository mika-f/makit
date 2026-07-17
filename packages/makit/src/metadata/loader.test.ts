import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MakitError } from "../core/errors.js";
import { loadMetadataFile } from "./loader.js";

// Fixture files import the define functions by absolute path because the
// temp project has no node_modules to resolve the package specifier from.
const METADATA_ENTRY = fileURLToPath(new URL("./index.ts", import.meta.url));

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "makit-metadata-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function write(relativePath: string, content: string): Promise<string> {
  const fullPath = join(dir, relativePath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, content, "utf-8");
  return fullPath;
}

async function expectError(promise: Promise<unknown>, code: string): Promise<MakitError> {
  const error = await promise.then(
    () => {
      throw new Error("expected the loader to throw");
    },
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(MakitError);
  expect((error as MakitError).code).toBe(code);
  return error as MakitError;
}

describe("loadMetadataFile", () => {
  it("loads collection metadata created with defineCollection", async () => {
    const path = await write(
      "docs/makit/collection.makit.ts",
      `import { defineCollection } from ${JSON.stringify(METADATA_ENTRY)};
       export default defineCollection({ id: "makit", title: "Makit", path: "/makit" });`,
    );

    const loaded = await loadMetadataFile(path, "collection", { projectRoot: dir });

    expect(loaded.value).toEqual({ id: "makit", title: "Makit", path: "/makit" });
    expect(loaded.dependencies).toHaveLength(0);
    expect(loaded.warnings).toHaveLength(0);
    expect(loaded.evalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it("loads page metadata created with definePageMetadata", async () => {
    const path = await write(
      "docs/guides/configuration.meta.ts",
      `import { definePageMetadata } from ${JSON.stringify(METADATA_ENTRY)};
       export default definePageMetadata({
         id: "configuration",
         title: "Configuration",
         slug: ["guides", "configuration"],
         taxonomy: { topics: ["configuration"] },
       });`,
    );

    const loaded = await loadMetadataFile(path, "page", { projectRoot: dir });

    expect(loaded.value).toMatchObject({ id: "configuration", title: "Configuration" });
  });

  it("loads navigation and category metadata", async () => {
    const navigationPath = await write(
      "docs/makit/navigation.makit.ts",
      `import { defineNavigation } from ${JSON.stringify(METADATA_ENTRY)};
       export default defineNavigation({
         items: [
           { type: "page", page: "overview" },
           { type: "section", title: "Guides", items: [{ type: "page", page: "configuration" }] },
         ],
       });`,
    );
    const categoryPath = await write(
      "docs/makit/guides/category.makit.ts",
      `import { defineCategory } from ${JSON.stringify(METADATA_ENTRY)};
       export default defineCategory({ id: "guides", title: "Guides", type: "section", order: 10 });`,
    );

    const navigation = await loadMetadataFile(navigationPath, "navigation", { projectRoot: dir });
    const category = await loadMetadataFile(categoryPath, "category", { projectRoot: dir });

    expect(navigation.value).toMatchObject({ items: [{ type: "page", page: "overview" }, {}] });
    expect(category.value).toMatchObject({ id: "guides", type: "section" });
  });

  it("rejects a file that fails to evaluate", async () => {
    const path = await write("broken.makit.ts", `throw new Error("boom");`);
    const error = await expectError(
      loadMetadataFile(path, "collection", { projectRoot: dir }),
      "metadata-eval-failed",
    );
    expect(error.message).toContain(path);
  });

  it("rejects a file without a default export", async () => {
    const path = await write(
      "collection.makit.ts",
      `import { defineCollection } from ${JSON.stringify(METADATA_ENTRY)};
       export const collection = defineCollection({ id: "makit", title: "Makit" });`,
    );
    const error = await expectError(
      loadMetadataFile(path, "collection", { projectRoot: dir }),
      "metadata-missing-default-export",
    );
    expect(error.message).toContain("defineCollection");
  });

  it("rejects a default export from the wrong define function", async () => {
    const path = await write(
      "collection.makit.ts",
      `import { defineCategory } from ${JSON.stringify(METADATA_ENTRY)};
       export default defineCategory({ title: "Guides" });`,
    );
    const error = await expectError(
      loadMetadataFile(path, "collection", { projectRoot: dir }),
      "metadata-wrong-define-function",
    );
    expect(error.message).toContain("defineCategory()");
    expect(error.message).toContain("defineCollection()");
  });

  it("rejects a plain object not wrapped in a define function", async () => {
    const path = await write(
      "collection.makit.ts",
      `export default { id: "makit", title: "Makit" };`,
    );
    const error = await expectError(
      loadMetadataFile(path, "collection", { projectRoot: dir }),
      "metadata-wrong-define-function",
    );
    expect(error.message).toContain("Wrap the exported object with defineCollection()");
  });

  it("rejects an async function default export (spec §20 example)", async () => {
    const path = await write(
      "collection.makit.ts",
      `export default async function loadMetadata() {
         return { id: "makit", title: "remote" };
       }`,
    );
    await expectError(
      loadMetadataFile(path, "collection", { projectRoot: dir }),
      "metadata-async",
    );
  });

  it("rejects a Promise default export", async () => {
    const path = await write(
      "collection.makit.ts",
      `export default Promise.resolve({ id: "makit", title: "Makit" });`,
    );
    await expectError(
      loadMetadataFile(path, "collection", { projectRoot: dir }),
      "metadata-async",
    );
  });

  it("rejects non-serializable values inside metadata", async () => {
    const path = await write(
      "page.meta.ts",
      `import { definePageMetadata } from ${JSON.stringify(METADATA_ENTRY)};
       export default definePageMetadata({ title: "Page", layout: (() => "custom") as never });`,
    );
    const error = await expectError(
      loadMetadataFile(path, "page", { projectRoot: dir }),
      "metadata-not-serializable",
    );
    expect(error.message).toContain("layout");
  });

  it("rejects non-plain object instances inside metadata", async () => {
    const path = await write(
      "page.meta.ts",
      `import { definePageMetadata } from ${JSON.stringify(METADATA_ENTRY)};
       export default definePageMetadata({ title: "Page", canonical: new Date() as never });`,
    );
    const error = await expectError(
      loadMetadataFile(path, "page", { projectRoot: dir }),
      "metadata-not-serializable",
    );
    expect(error.message).toContain("Date");
  });

  it("rejects circular references but allows shared references", async () => {
    const circularPath = await write(
      "circular.meta.ts",
      `import { definePageMetadata } from ${JSON.stringify(METADATA_ENTRY)};
       const navigation: Record<string, unknown> = { title: "loop" };
       navigation.self = navigation;
       export default definePageMetadata({ title: "Page", navigation: navigation as never });`,
    );
    await expectError(
      loadMetadataFile(circularPath, "page", { projectRoot: dir }),
      "metadata-circular-reference",
    );

    const sharedPath = await write(
      "shared.makit.ts",
      `import { defineNavigation } from ${JSON.stringify(METADATA_ENTRY)};
       const shared = { type: "page", page: "configuration" } as const;
       export default defineNavigation({
         items: [
           { type: "section", title: "A", items: [shared] },
           { type: "section", title: "B", items: [shared] },
         ],
       });`,
    );
    const loaded = await loadMetadataFile(sharedPath, "navigation", { projectRoot: dir });
    expect(loaded.value).toMatchObject({ items: [{ title: "A" }, { title: "B" }] });
  });

  it("collects transitive local import dependencies (spec §19)", async () => {
    const sharedDefaults = await write(
      "metadata/defaults.ts",
      `export const order = 30;`,
    );
    const sharedItems = await write(
      "metadata/navigation.ts",
      `import { order } from "./defaults.js";
       export const commonItems = [{ type: "page" as const, page: "overview" }];
       export const commonOrder = order;`,
    );
    const path = await write(
      "docs/makit/navigation.makit.ts",
      `import { defineNavigation } from ${JSON.stringify(METADATA_ENTRY)};
       import { commonItems } from "../../metadata/navigation.js";
       export default defineNavigation({ items: commonItems });`,
    );

    const loaded = await loadMetadataFile(path, "navigation", { projectRoot: dir });

    // Dependencies are reported as real paths (e.g. /private/var on macOS).
    expect(loaded.dependencies).toContain(await realpath(sharedItems));
    expect(loaded.dependencies).toContain(await realpath(sharedDefaults));
    // The define-functions entry itself is a package-internal import chain,
    // reported because the fixture imports it by relative-independent path;
    // only project-local relative imports are tracked.
    expect(loaded.dependencies).toHaveLength(2);
  });

  it("warns when metadata reads process.env (spec §21)", async () => {
    const path = await write(
      "collection.makit.ts",
      `import { defineCollection } from ${JSON.stringify(METADATA_ENTRY)};
       export default defineCollection({
         id: "makit",
         title: process.env.PRODUCT_NAME ?? "Makit",
       });`,
    );

    const loaded = await loadMetadataFile(path, "collection", { projectRoot: dir });

    expect(loaded.warnings).toMatchObject([{ code: "env-var-in-metadata" }]);
    expect(loaded.warnings[0]?.message).toContain("process.env");
  });

  it("warns on imports resolving outside the project root (spec §46)", async () => {
    const outside = await mkdtemp(join(tmpdir(), "makit-outside-"));
    try {
      await writeFile(join(outside, "shared.ts"), `export const title = "Shared";`, "utf-8");
      const path = await write(
        "collection.makit.ts",
        `import { defineCollection } from ${JSON.stringify(METADATA_ENTRY)};
         import { title } from ${JSON.stringify(join(outside, "shared.js").replace(/\\/g, "/"))};
         export default defineCollection({ id: "makit", title });`,
      );

      // An absolute import specifier is not tracked (only relative ones are);
      // use a relative path traversal instead to hit the warning path.
      const relativeEscape = await write(
        "docs/collection.makit.ts",
        `import { defineCollection } from ${JSON.stringify(METADATA_ENTRY)};
         import { title } from "../../${outside.split("/").at(-1)}/shared.js";
         export default defineCollection({ id: "makit2", title });`,
      );
      void path;

      const loaded = await loadMetadataFile(relativeEscape, "collection", { projectRoot: dir });
      expect(loaded.warnings).toMatchObject([{ code: "out-of-project-import" }]);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});
