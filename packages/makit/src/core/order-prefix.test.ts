import { describe, expect, it } from "vitest";
import { MakitError } from "./errors.js";
import { parseOrderedSegment } from "./order-prefix.js";

describe("parseOrderedSegment", () => {
  it("parses a two-digit prefix", () => {
    expect(parseOrderedSegment("01-installation", "01-installation.md")).toEqual({
      name: "installation",
      order: 1,
    });
  });

  it("parses prefixes of any digit width (spec §2)", () => {
    expect(parseOrderedSegment("1-overview", "x")).toEqual({ name: "overview", order: 1 });
    expect(parseOrderedSegment("001-overview", "x")).toEqual({ name: "overview", order: 1 });
    expect(parseOrderedSegment("100-reference", "x")).toEqual({ name: "reference", order: 100 });
  });

  it("returns the name unchanged when there is no prefix", () => {
    expect(parseOrderedSegment("installation", "x")).toEqual({ name: "installation" });
  });

  it("does not treat a negative number as a prefix (spec §17)", () => {
    expect(parseOrderedSegment("-1-page", "x")).toEqual({ name: "-1-page" });
  });

  it("does not treat a decimal as a prefix (spec §17)", () => {
    expect(parseOrderedSegment("1.5-page", "x")).toEqual({ name: "1.5-page" });
  });

  it("preserves further hyphens in the remaining name", () => {
    expect(parseOrderedSegment("02-getting-started", "x")).toEqual({
      name: "getting-started",
      order: 2,
    });
  });

  it("throws MakitError('empty-name-after-order-prefix') when nothing follows the prefix", () => {
    try {
      parseOrderedSegment("01-", "01-.md");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(MakitError);
      expect((error as MakitError).code).toBe("empty-name-after-order-prefix");
    }
  });

  it("throws MakitError('order-prefix-out-of-range') for numbers beyond the safe integer range (spec §22)", () => {
    try {
      parseOrderedSegment("99999999999999999999-page", "x");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(MakitError);
      expect((error as MakitError).code).toBe("order-prefix-out-of-range");
    }
  });
});
