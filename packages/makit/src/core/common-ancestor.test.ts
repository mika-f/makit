import { join, parse, win32 } from "node:path";
import { describe, expect, it } from "vitest";
import { commonAncestorDir } from "./common-ancestor.js";

describe("commonAncestorDir", () => {
  it("returns the deepest shared directory for host-platform paths", () => {
    expect(
      commonAncestorDir([join(__dirname, "a", "b"), join(__dirname, "a", "c"), join(__dirname, "a")]),
    ).toBe(join(__dirname, "a"));
  });

  it("returns the single path when only one is given", () => {
    expect(commonAncestorDir([join(__dirname, "only")])).toBe(join(__dirname, "only"));
  });

  it("returns the shared root for identical paths", () => {
    expect(commonAncestorDir([join(__dirname, "x"), join(__dirname, "x")])).toBe(
      join(__dirname, "x"),
    );
  });

  it("returns a well-formed root when paths share nothing but the root", () => {
    const root = parse(__dirname).root;
    expect(commonAncestorDir([join(root, "foo", "bar"), join(root, "baz", "qux")])).toBe(root);
  });

  describe("on win32 paths", () => {
    it("keeps the drive letter attached to the root instead of prefixing a stray separator", () => {
      // Regression test: the old implementation always prepended `sep`
      // ("\") to the joined segments, producing "\G:\ghq\..." — an invalid
      // path with the drive letter demoted to a plain folder name. That
      // corrupted path, passed as Turbopack's `root`, is what produced the
      // "distDirRoot should not navigate out of the projectPath" panic.
      const result = commonAncestorDir(
        [
          String.raw`G:\ghq\github.com\mika-f\makit\examples\basic`,
          String.raw`G:\ghq\github.com\mika-f\makit\node_modules\.pnpm\next\node_modules\next`,
        ],
        win32,
      );
      expect(result).toBe(String.raw`G:\ghq\github.com\mika-f\makit`);
    });

    it("falls back to the first path's root when inputs live on different drives", () => {
      const result = commonAncestorDir(
        [String.raw`G:\ghq\project`, String.raw`C:\Users\someone\.pnpm-store\next`],
        win32,
      );
      expect(result).toBe("G:\\");
    });

    it("returns the drive root when a path is exactly the drive root", () => {
      const result = commonAncestorDir([String.raw`G:\ghq\project`, "G:\\"], win32);
      expect(result).toBe("G:\\");
    });
  });
});
