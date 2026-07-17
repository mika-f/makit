import { describe, expect, it } from "vitest";
import {
  defineCategory,
  defineCollection,
  defineNavigation,
  definePageMetadata,
  getMetadataKind,
} from "./define.js";

describe("define functions", () => {
  it("brand each metadata value with its kind", () => {
    expect(getMetadataKind(defineCollection({ id: "makit", title: "Makit" }))).toBe("collection");
    expect(getMetadataKind(defineNavigation({ items: [] }))).toBe("navigation");
    expect(getMetadataKind(defineCategory({ title: "Guides" }))).toBe("category");
    expect(getMetadataKind(definePageMetadata({ title: "Page" }))).toBe("page");
  });

  it("return the input value unchanged", () => {
    const input = { id: "makit", title: "Makit" };
    const output = defineCollection(input);
    expect(output).toBe(input);
    expect(output).toEqual({ id: "makit", title: "Makit" });
  });

  it("keep the brand out of enumeration and serialization", () => {
    const value = definePageMetadata({ title: "Page" });
    expect(Object.keys(value)).toEqual(["title"]);
    expect(JSON.stringify(value)).toBe('{"title":"Page"}');
  });

  it("report no kind for unbranded values", () => {
    expect(getMetadataKind({ id: "x" })).toBeUndefined();
    expect(getMetadataKind(null)).toBeUndefined();
    expect(getMetadataKind("collection")).toBeUndefined();
  });
});
