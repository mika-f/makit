// @vitest-environment jsdom
import { act, createElement, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { enhanceDisclosures } from "./disclosures.js";
import { PageContent } from "./page-content.js";

const markup = `<details data-makit-toggle name="first"><summary>One</summary><div><details data-makit-toggle><summary>Nested</summary><h2 id="見出し">Heading</h2></details></div></details><details data-makit-toggle name="first" open><summary>Two</summary><p>Other answer.</p></details>`;
function details() {
  return [...document.querySelectorAll<HTMLDetailsElement>("details")];
}

afterEach(() => {
  document.body.innerHTML = "";
  window.history.replaceState(null, "", "/");
});

describe("disclosure enhancement", () => {
  it("reveals every closed ancestor on initial and subsequent heading anchors", () => {
    document.body.innerHTML = markup;
    const target = document.getElementById("見出し")!;
    target.scrollIntoView = vi.fn();
    window.history.replaceState(null, "", `#${encodeURIComponent("見出し")}`);
    const cleanup = enhanceDisclosures(document.body);
    expect(details()[0]!.open).toBe(true);
    expect(details()[1]!.open).toBe(true);
    expect(target.scrollIntoView).toHaveBeenCalledOnce();
    details()[0]!.open = false;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(details()[0]!.open).toBe(true);
    cleanup();
  });

  it("ignores malformed hashes and targets outside page content", () => {
    document.body.innerHTML = `<h2 id="outside">Outside</h2><main>${markup}</main>`;
    const cleanup = enhanceDisclosures(document.querySelector("main")!);
    for (const hash of ["#%zz", "#outside", "#missing"]) {
      window.history.replaceState(null, "", hash);
      expect(() => window.dispatchEvent(new HashChangeEvent("hashchange"))).not.toThrow();
      expect(details()[0]!.open).toBe(false);
    }
    cleanup();
  });

  it("opens all content for printing and restores open state and exclusive names afterward", () => {
    document.body.innerHTML = markup;
    const cleanup = enhanceDisclosures(document.body);
    const initial = details().map((detail) => ({
      open: detail.open,
      name: detail.getAttribute("name"),
    }));
    window.dispatchEvent(new Event("beforeprint"));
    window.dispatchEvent(new Event("beforeprint"));
    expect(details().every((detail) => detail.open && !detail.hasAttribute("name"))).toBe(true);
    window.dispatchEvent(new Event("afterprint"));
    expect(
      details().map((detail) => ({ open: detail.open, name: detail.getAttribute("name") })),
    ).toEqual(initial);
    cleanup();
  });

  it("removes listeners and restores a pending print snapshot on cleanup", () => {
    document.body.innerHTML = markup;
    const cleanup = enhanceDisclosures(document.body);
    window.dispatchEvent(new Event("beforeprint"));
    cleanup();
    expect(details()[0]!.open).toBe(false);
    expect(details()[2]!.getAttribute("name")).toBe("first");
    window.history.replaceState(null, "", `#${encodeURIComponent("見出し")}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    window.dispatchEvent(new Event("beforeprint"));
    expect(details()[0]!.open).toBe(false);
  });

  it("reinitializes through PageContent navigation with copy buttons disabled in Strict Mode", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const root = createRoot(document.body);
    window.history.replaceState(null, "", "#target");
    try {
      await act(async () =>
        root.render(
          createElement(
            StrictMode,
            null,
            createElement(PageContent, { html: markup, copyButton: false }),
          ),
        ),
      );
      expect(details()[0]!.open).toBe(false);
      await act(async () =>
        root.render(
          createElement(
            StrictMode,
            null,
            createElement(PageContent, {
              html: markup.replace("見出し", "target"),
              copyButton: false,
            }),
          ),
        ),
      );
      expect(details()[0]!.open).toBe(true);
      expect(details()[1]!.open).toBe(true);
    } finally {
      await act(async () => root.unmount());
    }
  });
});
