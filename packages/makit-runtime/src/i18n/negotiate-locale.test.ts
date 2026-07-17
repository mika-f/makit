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

  describe("multi-region (en-US / en-GB)", () => {
    const locales = loc("en-US", "en-GB", "ja-JP");

    it("distinguishes regions when the tag carries one", () => {
      expect(negotiateLocale(locales, ["en-GB"])?.locale).toBe("en-GB");
      expect(negotiateLocale(locales, ["en-US"])?.locale).toBe("en-US");
    });

    it("prefers an exact region over a sibling region", () => {
      // en-AU: no exact/generic match → both en-US and en-GB are siblings; the
      // default breaks the tie.
      expect(negotiateLocale(locales, ["en-AU"], { default: "en-GB" })?.locale).toBe("en-GB");
      expect(negotiateLocale(locales, ["en-AU"], { default: "en-US" })?.locale).toBe("en-US");
    });

    it("uses the default locale to break a bare-language tie", () => {
      expect(negotiateLocale(locales, ["en"], { default: "en-GB" })?.locale).toBe("en-GB");
      expect(negotiateLocale(locales, ["en"], { default: "en-US" })?.locale).toBe("en-US");
    });

    it("falls back to declaration order when no default disambiguates", () => {
      expect(negotiateLocale(locales, ["en"])?.locale).toBe("en-US");
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
