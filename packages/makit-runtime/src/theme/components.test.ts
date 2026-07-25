import { describe, expect, it } from "vitest";
import { defaultThemeComponents, pickThemeSlots, resolveThemeComponents } from "./components.js";
import { THEME_SLOT_NAMES } from "./slot-names.js";

function CustomHeader() {
  return null;
}

describe("defaultThemeComponents", () => {
  it("implements every slot", () => {
    for (const slot of THEME_SLOT_NAMES) {
      expect(typeof defaultThemeComponents[slot]).toBe("function");
    }
  });
});

describe("resolveThemeComponents", () => {
  it("falls back to the standard theme for every slot when given nothing", () => {
    expect(resolveThemeComponents()).toEqual(defaultThemeComponents);
    expect(resolveThemeComponents({})).toEqual(defaultThemeComponents);
  });

  it("applies an override and leaves the other slots alone", () => {
    const resolved = resolveThemeComponents({ Header: CustomHeader });
    expect(resolved.Header).toBe(CustomHeader);
    expect(resolved.Footer).toBe(defaultThemeComponents.Footer);
  });

  it("turns `false` into a component that renders nothing", () => {
    const resolved = resolveThemeComponents({ Footer: false });
    expect(resolved.Footer).not.toBe(defaultThemeComponents.Footer);
    expect(resolved.Footer({} as never)).toBeNull();
  });

  it("ignores explicitly undefined overrides", () => {
    const resolved = resolveThemeComponents({ Header: undefined });
    expect(resolved.Header).toBe(defaultThemeComponents.Header);
  });
});

describe("pickThemeSlots", () => {
  it("keeps slot-shaped exports and drops everything else", () => {
    const picked = pickThemeSlots({
      Header: CustomHeader,
      Footer: false,
      // Not a slot name.
      helper: CustomHeader,
      // A slot name, but not a component.
      Sidebar: "nope",
    });

    expect(picked).toEqual({ Header: CustomHeader, Footer: false });
  });

  it("returns an empty map for a namespace with no slots", () => {
    expect(pickThemeSlots({ default: CustomHeader })).toEqual({});
  });
});
