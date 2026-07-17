import { describe, expect, it } from "vitest";
import { negotiateLocale } from "./negotiate-locale.js";

const loc = (...tags: string[]) => tags.map((locale) => ({ locale }));

describe("negotiateLocale", () => {
  it("returns undefined when there are no candidates", () => {
    expect(negotiateLocale([], ["en"])).toBeUndefined();
  });

  it("returns undefined when no preference shares a language", () => {
    expect(negotiateLocale(loc("en-US", "ja-JP"), ["fr", "de"])).toBeUndefined();
  });

  it("matches an exact tag case-insensitively", () => {
    expect(negotiateLocale(loc("en-US", "ja-JP"), ["ja-JP"])?.locale).toBe("ja-JP");
    expect(negotiateLocale(loc("en-US", "ja-JP"), ["JA-jp"])?.locale).toBe("ja-JP");
  });

  it("matches by primary language when only a bare tag is offered", () => {
    expect(negotiateLocale(loc("en-US", "ja-JP"), ["ja"])?.locale).toBe("ja-JP");
    expect(negotiateLocale(loc("en-US", "ja-JP"), ["en"])?.locale).toBe("en-US");
  });

  // The core regression: a first-choice language matched only by primary subtag
  // must beat a lower-priority language that happens to match a locale exactly.
  // Chrome's default for Japanese is exactly ["ja", "en-US", "en"].
  it("honors preference order over exactness across languages", () => {
    expect(negotiateLocale(loc("en-US", "ja-JP"), ["ja", "en-US", "en"])?.locale).toBe("ja-JP");
    expect(negotiateLocale(loc("en-US", "ja-JP"), ["en-US", "ja"])?.locale).toBe("en-US");
  });

  describe("multi-region (both en-US and en-GB present)", () => {
    // Declaration order is en-US before en-GB — used as the tiebreak of last resort.
    const locales = loc("en-US", "en-GB", "ja-JP");

    // Full request × default matrix against a fixed candidate set.
    it.each([
      // requested,            default,   expected,  why
      [["en-US"], undefined, "en-US", "exact region"],
      [["en-GB"], undefined, "en-GB", "exact region"],
      [["en-US", "en-GB"], undefined, "en-US", "priority order (both exact)"],
      [["en-GB", "en-US"], undefined, "en-GB", "priority order (both exact)"],
      [["en"], undefined, "en-US", "bare tie → declaration order"],
      [["en"], "en-GB", "en-GB", "bare tie → default"],
      [["en"], "en-US", "en-US", "bare tie → default"],
      [["en-AU"], undefined, "en-US", "sibling tie → declaration order"],
      [["en-AU"], "en-GB", "en-GB", "sibling tie → default"],
      [["en-AU"], "en-US", "en-US", "sibling tie → default"],
      [["en-GB"], "en-US", "en-GB", "exact match outranks the default's nudge"],
      [["en-US"], "en-GB", "en-US", "exact match outranks the default's nudge"],
      [["fr", "en-GB"], "en-US", "en-GB", "skip unmatched language, then exact region"],
      [["fr", "en"], "en-GB", "en-GB", "skip unmatched language, then bare tie → default"],
      [["ja", "en-GB"], "en-US", "ja-JP", "cross-language priority beats a later exact region"],
    ] as const)("requested=%j default=%s → %s (%s)", (requested, def, expected) => {
      const options = def === undefined ? undefined : { default: def };
      expect(negotiateLocale(locales, [...requested], options)?.locale).toBe(expected);
    });

    it("ranks by match quality, not declaration order", () => {
      // en-GB declared first, but an exact en-US request must still win.
      const reordered = loc("en-GB", "en-US", "ja-JP");
      expect(negotiateLocale(reordered, ["en-US"])?.locale).toBe("en-US");
    });

    it("falls back to a sibling region when the exact region is absent", () => {
      // Only en-GB is offered; an en-US visitor still gets English.
      expect(negotiateLocale(loc("en-GB", "ja-JP"), ["en-US"])?.locale).toBe("en-GB");
    });

    it("never lets the default nudge cross a language boundary", () => {
      // default is en-US, but the visitor only speaks Japanese.
      expect(negotiateLocale(locales, ["ja"], { default: "en-US" })?.locale).toBe("ja-JP");
    });
  });

  describe("script subtags (spec §35.3)", () => {
    const locales = loc("zh-Hans-CN", "zh-Hant-TW", "en-US");

    it("prefers an exact script+region match", () => {
      expect(negotiateLocale(locales, ["zh-Hant-TW"])?.locale).toBe("zh-Hant-TW");
    });

    it("prefers a matching script over a matching region-only sibling", () => {
      // zh-Hant-HK shares the script with zh-Hant-TW but neither region matches.
      expect(negotiateLocale(locales, ["zh-Hant-HK"])?.locale).toBe("zh-Hant-TW");
    });
  });

  it("prefers a bare-language locale over region variants for a bare request", () => {
    expect(negotiateLocale(loc("en", "en-US", "en-GB"), ["en"])?.locale).toBe("en");
  });

  it("ignores empty preference entries", () => {
    expect(negotiateLocale(loc("en-US", "ja-JP"), ["", "ja"])?.locale).toBe("ja-JP");
  });
});
