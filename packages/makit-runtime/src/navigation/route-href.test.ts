import { describe, expect, it } from "vitest";
import { toLinkHref } from "./route-href.js";

describe("toLinkHref", () => {
  it("strips basePath from a generated route", () => {
    expect(toLinkHref("/docs/ja-jp/getting-started/", "/docs")).toBe("/ja-jp/getting-started/");
  });

  it("maps the basePath root to /", () => {
    expect(toLinkHref("/docs/", "/docs")).toBe("/");
    expect(toLinkHref("/docs", "/docs")).toBe("/");
  });

  it("keeps a query or hash attached to the basePath root", () => {
    expect(toLinkHref("/docs?q=1", "/docs")).toBe("/?q=1");
    expect(toLinkHref("/docs#top", "/docs")).toBe("/#top");
    expect(toLinkHref("/docs/en-us/#install", "/docs")).toBe("/en-us/#install");
  });

  it("leaves hrefs without basePath unchanged", () => {
    expect(toLinkHref("/en-us/getting-started/", "/docs")).toBe("/en-us/getting-started/");
    expect(toLinkHref("/", "/docs")).toBe("/");
    expect(toLinkHref("#", "/docs")).toBe("#");
    expect(toLinkHref("https://example.com/docs/", "/docs")).toBe("https://example.com/docs/");
  });

  it("only strips on a segment boundary", () => {
    expect(toLinkHref("/docs-old/page/", "/docs")).toBe("/docs-old/page/");
    expect(toLinkHref("/docsite/", "/docs")).toBe("/docsite/");
  });

  it("is a no-op without basePath", () => {
    expect(toLinkHref("/en-us/getting-started/", "")).toBe("/en-us/getting-started/");
  });
});
