import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Writes `content` to `path` via a temp-file-then-rename, so a concurrent
 * reader (e.g. a live `next dev`/Turbopack process watching `.makit/`) never
 * observes a torn write — `rename()` within the same directory is atomic, so
 * readers see either the whole old file or the whole new one, never a mix
 * (which otherwise surfaces as e.g. corrupted bytes mid-file on config
 * reload, spec §43).
 */
export async function atomicWriteFile(path: string, content: string): Promise<void> {
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
