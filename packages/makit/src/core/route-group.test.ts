import { describe, expect, it } from "vitest";
import { MakitError } from "./errors.js";
import { parseRouteGroupSegment } from "./route-group.js";

describe("parseRouteGroupSegment", () => {
  it("unwraps a route group", () => {
    expect(parseRouteGroupSegment("(marketing)", "src")).toEqual({
      name: "marketing",
      isRouteGroup: true,
    });
  });

  it("leaves an ordinary name untouched", () => {
    expect(parseRouteGroupSegment("marketing", "src")).toEqual({
      name: "marketing",
      isRouteGroup: false,
    });
  });

  it("leaves a name with only a leading or trailing paren untouched", () => {
    expect(parseRouteGroupSegment("(marketing", "src")).toEqual({
      name: "(marketing",
      isRouteGroup: false,
    });
    expect(parseRouteGroupSegment("marketing)", "src")).toEqual({
      name: "marketing)",
      isRouteGroup: false,
    });
  });

  it("throws MakitError('empty-name-in-route-group') for an empty group name", () => {
    try {
      parseRouteGroupSegment("()", "src/()");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(MakitError);
      expect((error as MakitError).code).toBe("empty-name-in-route-group");
    }
  });
});
