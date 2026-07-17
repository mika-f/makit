import { rm } from "node:fs/promises";
import { join } from "node:path";
import * as pagefind from "pagefind";
import { MakitError } from "./errors.js";

/**
 * Builds the static Pagefind bundle after Next has exported the site HTML.
 * The bundle is copied with the rest of the static output and is loaded by
 * the runtime search dialog directly from the deployed site.
 */
export async function writePagefindIndex(outDir: string): Promise<void> {
  let index: Awaited<ReturnType<typeof pagefind.createIndex>>["index"];

  try {
    const created = await pagefind.createIndex({
      // Documentation frequently contains identifiers where punctuation matters.
      includeCharacters: "._-/@",
    });
    if (!created.index) {
      throw new MakitError(
        "output-write-failed",
        `Pagefind could not create its search index:\n${created.errors.join("\n")}`,
      );
    }
    index = created.index;

    const added = await index.addDirectory({ path: outDir });
    if (added.errors.length > 0) {
      throw new MakitError(
        "output-write-failed",
        `Pagefind could not index the static output:\n${added.errors.join("\n")}`,
      );
    }

    const outputPath = join(outDir, "pagefind");
    await rm(outputPath, { recursive: true, force: true });
    const written = await index.writeFiles({ outputPath });
    if (written.errors.length > 0) {
      throw new MakitError(
        "output-write-failed",
        `Pagefind could not write its search bundle:\n${written.errors.join("\n")}`,
      );
    }
  } finally {
    if (index) await index.deleteIndex();
    await pagefind.close();
  }
}
