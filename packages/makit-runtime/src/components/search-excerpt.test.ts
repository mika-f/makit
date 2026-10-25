import { describe, expect, it } from "vitest";
import { decodePagefindExcerpt } from "./search-excerpt.js";

describe("Pagefind excerpt decoding", () => {
  it("restores angle brackets escaped by Pagefind", () => {
    expect(decodePagefindExcerpt('Use &lt;Camera fov="60" /&gt; here.')).toBe(
      'Use <Camera fov="60" /> here.',
    );
  });

  it("leaves characters Pagefind does not escape untouched", () => {
    expect(decodePagefindExcerpt('Tom & Jerry, it\'s "quoted" café ©')).toBe(
      'Tom & Jerry, it\'s "quoted" café ©',
    );
  });

  it("decodes in a single pass", () => {
    expect(decodePagefindExcerpt("&amp; and &amp;lt;")).toBe("&amp; and &amp;lt;");
    expect(decodePagefindExcerpt("&lt;lt;")).toBe("<lt;");
  });
});
