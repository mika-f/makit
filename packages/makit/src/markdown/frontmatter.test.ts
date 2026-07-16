import { describe, expect, it } from "vitest";
import { MakitError } from "../core/errors.js";
import { parseFrontMatter } from "./frontmatter.js";

describe("parseFrontMatter", () => {
  it("extracts YAML front matter and the remaining body", () => {
    const result = parseFrontMatter("---\ntitle: Hello\norder: 5\n---\n# Body\ntext\n", "test.md");
    expect(result.data.title).toBe("Hello");
    expect(result.data.order).toBe(5);
    expect(result.content).toContain("# Body");
  });

  it("returns an empty object when there is no front matter", () => {
    const result = parseFrontMatter("# Just content\n", "test.md");
    expect(result.data).toEqual({});
    expect(result.content).toContain("# Just content");
  });

  it("accepts an array slug", () => {
    const result = parseFrontMatter(
      "---\nslug:\n  - guides\n  - configuration\n---\nbody",
      "test.md",
    );
    expect(result.data.slug).toEqual(["guides", "configuration"]);
  });

  it("strips unknown keys instead of failing", () => {
    const result = parseFrontMatter("---\ntitle: Hi\ncustomField: whatever\n---\nbody", "test.md");
    expect(result.data.title).toBe("Hi");
    expect((result.data as Record<string, unknown>).customField).toBeUndefined();
  });

  it("throws MakitError('frontmatter-parse-failed') on malformed YAML", () => {
    try {
      parseFrontMatter("---\ntitle: [unterminated\n---\nbody", "broken.md");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(MakitError);
      expect((error as MakitError).code).toBe("frontmatter-parse-failed");
    }
  });

  it("throws MakitError('frontmatter-parse-failed') on a wrong-typed field", () => {
    try {
      parseFrontMatter("---\ndraft: not-a-boolean\n---\nbody", "wrong-type.md");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(MakitError);
      expect((error as MakitError).code).toBe("frontmatter-parse-failed");
    }
  });
});
