import { describe, expect, it } from "vitest";
import { processStaticPageHtml } from "./static-page-html.js";

describe("processStaticPageHtml (STATIC-PAGES §8)", () => {
  it("prefixes root-relative href and src with basePath", () => {
    const { html } = processStaticPageHtml(
      '<a href="/pricing/">Pricing</a><img src="/og.png">',
      "/docs",
    );
    expect(html).toBe('<a href="/docs/pricing/">Pricing</a><img src="/docs/og.png">');
  });

  it("leaves relative, external, anchor, and mailto URLs alone", () => {
    const source =
      '<a href="./a/">a</a><a href="https://x.dev/">b</a><a href="#top">c</a><a href="mailto:a@b">d</a>';
    expect(processStaticPageHtml(source, "/docs").html).toBe(source);
  });

  it("leaves protocol-relative URLs and srcset alone", () => {
    const source = '<script src="//cdn.example.com/a.js"></script><img srcset="/a.png 1x">';
    expect(processStaticPageHtml(source, "/docs").html).toBe(source);
  });

  it("changes nothing without a basePath", () => {
    expect(processStaticPageHtml('<a href="/pricing/">Pricing</a>', "")).toEqual({
      html: '<a href="/pricing/">Pricing</a>',
      isDocument: false,
    });
  });

  it("keeps only the body of a full document and flags it", () => {
    expect(
      processStaticPageHtml(
        "<!doctype html><html><head><title>x</title></head><body><p>hi</p></body></html>",
        "",
      ),
    ).toEqual({ html: "<p>hi</p>", isDocument: true });
  });

  it("preserves attributes on fragment elements", () => {
    expect(processStaticPageHtml('<section class="a" id="b">x</section>', "").html).toBe(
      '<section class="a" id="b">x</section>',
    );
  });
});
