import { describe, expect, it } from "vitest";
import {
  OPTIONAL_THEME_SLOT_NAMES,
  THEME_PAGE_SLOT_NAMES,
  THEME_PART_SLOT_NAMES,
  THEME_SLOT_NAMES,
  THEME_SLOT_NAME_BY_FILE_NAME,
  isOptionalThemeSlotName,
  isThemeSlotName,
  themeSlotFileName,
} from "./slot-names.js";

describe("theme slot names", () => {
  it("is the union of page and part slots, with no duplicates", () => {
    expect(THEME_SLOT_NAMES).toEqual([...THEME_PAGE_SLOT_NAMES, ...THEME_PART_SLOT_NAMES]);
    expect(new Set(THEME_SLOT_NAMES).size).toBe(THEME_SLOT_NAMES.length);
  });

  it("recognizes only known slot names", () => {
    expect(isThemeSlotName("Header")).toBe(true);
    expect(isThemeSlotName("header")).toBe(false);
    expect(isThemeSlotName("Heder")).toBe(false);
  });

  it("never marks a page slot as optional", () => {
    for (const slot of THEME_PAGE_SLOT_NAMES) {
      expect(isOptionalThemeSlotName(slot)).toBe(false);
    }
  });

  it("only marks real slots as optional", () => {
    for (const slot of OPTIONAL_THEME_SLOT_NAMES) {
      expect(isThemeSlotName(slot)).toBe(true);
    }
  });

  it("converts slot names to kebab-case file names", () => {
    expect(themeSlotFileName("Header")).toBe("header");
    expect(themeSlotFileName("TableOfContents")).toBe("table-of-contents");
    expect(themeSlotFileName("PrevNextLinks")).toBe("prev-next-links");
  });

  it("maps every slot to a unique file name", () => {
    expect(Object.keys(THEME_SLOT_NAME_BY_FILE_NAME)).toHaveLength(THEME_SLOT_NAMES.length);
    expect(THEME_SLOT_NAME_BY_FILE_NAME["docs-page"]).toBe("DocsPage");
    expect(THEME_SLOT_NAME_BY_FILE_NAME["theme-variables"]).toBe("ThemeVariables");
  });
});
