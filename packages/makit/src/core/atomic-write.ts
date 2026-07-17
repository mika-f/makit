import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Writes `content` to `path` via a temp-file-then-rename, so a concurrent
 * reader (e.g. a live `next dev`/Turbopack process watching `.makit/`) never
 * observes a torn write — `rename()` within the same directory is atomic, so
 * readers see either the whole old file or the whole new one, never a mix
 * (which otherwise surfaces as e.g. corrupted bytes mid-file on config
 * reload, spec §43).
 *
 * Skips the write entirely when `path` already holds `content` byte-for-byte.
 * Most `.makit/` regeneration passes reproduce the same output (only a few
 * generated files actually depend on whichever config field changed), so
 * this keeps a reload from firing a burst of filesystem-change events at a
 * live dev server for files that didn't change — the burst itself is what
 * makes Turbopack's CSS pipeline flaky under rapid concurrent rebuilds.
 */
export async function atomicWriteFile(path: string, content: string): Promise<void> {
  const existing = await readFile(path, "utf-8").catch(() => null);
  if (existing === content) return;

  const dir = dirname(path);
  await mkdir(dir, { recursive: true });
  const tmpPath = join(dir, `.${randomUUID()}.tmp`);
  await writeFile(tmpPath, content, "utf-8");
  try {
    await rename(tmpPath, path);
  } catch (error) {
    await rm(tmpPath, { force: true });
    throw error;
  }
}
