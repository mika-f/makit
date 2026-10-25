import { describe, expect, it } from "vitest";
import * as nextNavigation from "next/navigation";
import * as navigation from "./navigation.js";

describe("next/navigation re-export", () => {
  it("exposes everything next/navigation does", () => {
    expect(Object.keys(navigation).sort()).toEqual(Object.keys(nextNavigation).sort());
    expect(Object.keys(navigation)).toEqual(
      expect.arrayContaining(["usePathname", "useSearchParams", "notFound"]),
    );
  });

  it("re-exports next/navigation's own bindings, not copies", () => {
    const reexported: Record<string, unknown> = navigation;
    for (const [name, value] of Object.entries(nextNavigation)) {
      expect(reexported[name], name).toBe(value);
    }
  });
});
