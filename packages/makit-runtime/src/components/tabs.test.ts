// @vitest-environment jsdom
import { act, createElement, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PageContent } from "./page-content.js";
import { enhanceTabs } from "./tabs.js";

function group(id: string, selected = 0): string {
  return `<div data-makit-tabs class="makit-tabs"><div role="tablist" class="makit-tab-list">${["npm", "pnpm", "yarn"].map((name, index) => `<button type="button" role="tab" id="${id}-tab-${index}" aria-controls="${id}-panel-${index}" aria-selected="${index === selected}" tabindex="${index === selected ? 0 : -1}">${name}</button>`).join("")}</div>${[0, 1, 2].map((index) => `<div role="tabpanel" id="${id}-panel-${index}" aria-labelledby="${id}-tab-${index}" tabindex="0"><p class="makit-tab-fallback-label">Label ${index}</p><h2 id="${id}-heading-${index}">Content ${index}</h2><pre class="shiki"><code>install ${index}</code></pre></div>`).join("")}</div>`;
}

function buttons(root: ParentNode = document) {
  return [...root.querySelectorAll<HTMLButtonElement>("[role=tab]")];
}
function panels(root: ParentNode = document) {
  return [...root.querySelectorAll<HTMLElement>("[role=tabpanel]")];
}
function key(button: HTMLButtonElement, value: string) {
  button.dispatchEvent(
    new KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true }),
  );
}

afterEach(() => {
  document.body.innerHTML = "";
  window.history.replaceState(null, "", "/");
});

describe("tab interaction", () => {
  it("initializes the configured default and switches by click with ARIA and roving focus", () => {
    document.body.innerHTML = group("first", 1);
    const cleanup = enhanceTabs(document.body);
    expect(panels().map((panel) => panel.hidden)).toEqual([true, false, true]);
    buttons()[2]!.click();
    expect(panels().map((panel) => panel.hidden)).toEqual([true, true, false]);
    expect(buttons().map((button) => button.getAttribute("aria-selected"))).toEqual([
      "false",
      "false",
      "true",
    ]);
    expect(buttons().map((button) => button.tabIndex)).toEqual([-1, -1, 0]);
    cleanup();
  });

  it("moves focus with arrows, wraps, and supports Home and End", () => {
    document.body.innerHTML = group("first");
    const cleanup = enhanceTabs(document.body);
    key(buttons()[0]!, "ArrowLeft");
    expect(document.activeElement).toBe(buttons()[2]);
    key(buttons()[2]!, "ArrowRight");
    expect(document.activeElement).toBe(buttons()[0]);
    key(buttons()[0]!, "End");
    expect(document.activeElement).toBe(buttons()[2]);
    key(buttons()[2]!, "Home");
    expect(document.activeElement).toBe(buttons()[0]);
    expect(panels()[0]!.hidden).toBe(false);
    cleanup();
  });

  it("keeps separate and nested groups independent", () => {
    document.body.innerHTML =
      group("outer").replace("Content 0</h2>", `Content 0</h2>${group("inner")}`) + group("other");
    const cleanup = enhanceTabs(document.body);
    document.getElementById("inner-tab-2")!.click();
    expect(document.getElementById("outer-panel-0")!.hidden).toBe(false);
    expect(document.getElementById("inner-panel-2")!.hidden).toBe(false);
    expect(document.getElementById("other-panel-0")!.hidden).toBe(false);
    document.getElementById("outer-tab-1")!.click();
    expect(document.getElementById("outer-panel-0")!.hidden).toBe(true);
    expect(document.getElementById("inner-tab-2")!.getAttribute("aria-selected")).toBe("true");
    cleanup();
  });

  it("reveals nested panels when a heading anchor is opened or changed", () => {
    document.body.innerHTML = group("outer").replace(
      "Content 1</h2>",
      `Content 1</h2>${group("inner")}`,
    );
    const scrollIntoView = vi.fn();
    document.getElementById("inner-heading-2")!.scrollIntoView = scrollIntoView;
    window.history.replaceState(null, "", "#inner-heading-2");
    const cleanup = enhanceTabs(document.body);
    expect(document.getElementById("outer-panel-1")!.hidden).toBe(false);
    expect(document.getElementById("inner-panel-2")!.hidden).toBe(false);
    expect(scrollIntoView).toHaveBeenCalledOnce();
    window.history.replaceState(null, "", "#outer-heading-0");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(document.getElementById("outer-panel-0")!.hidden).toBe(false);
    cleanup();
  });

  it("restores readable content and removes listeners on cleanup", () => {
    document.body.innerHTML = group("first");
    const cleanup = enhanceTabs(document.body);
    cleanup();
    expect(panels().every((panel) => !panel.hidden)).toBe(true);
    expect(document.querySelector("[data-tabs-ready]")).toBeNull();
    buttons()[2]!.click();
    expect(panels().every((panel) => !panel.hidden)).toBe(true);
    window.history.replaceState(null, "", "#first-heading-1");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(panels().every((panel) => !panel.hidden)).toBe(true);
  });

  it("handles malformed or empty custom HTML safely", () => {
    document.body.innerHTML =
      '<div data-makit-tabs><div class="makit-tab-list"><button role="tab">Orphan</button></div></div>';
    expect(() => enhanceTabs(document.body)()).not.toThrow();
    expect(document.querySelector("[data-tabs-ready]")).toBeNull();
  });
});

describe("PageContent lifecycle", () => {
  it("works without copy buttons and reinitializes after client navigation in Strict Mode", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const root = createRoot(document.body);
    try {
      await act(async () =>
        root.render(
          createElement(
            StrictMode,
            null,
            createElement(PageContent, { html: group("first"), copyButton: false }),
          ),
        ),
      );
      buttons()[1]!.click();
      expect(panels()[1]!.hidden).toBe(false);
      expect(document.querySelector(".makit-copy-button")).toBeNull();
      await act(async () =>
        root.render(
          createElement(
            StrictMode,
            null,
            createElement(PageContent, { html: group("second", 2), copyButton: true }),
          ),
        ),
      );
      expect(panels().map((panel) => panel.hidden)).toEqual([true, true, false]);
      expect(document.querySelectorAll(".makit-copy-button")).toHaveLength(3);
      buttons()[0]!.click();
      expect(panels()[0]!.hidden).toBe(false);
      await act(async () =>
        root.render(
          createElement(
            StrictMode,
            null,
            createElement(PageContent, { html: group("third"), copyButton: true }),
          ),
        ),
      );
      expect(document.querySelectorAll(".makit-copy-button")).toHaveLength(3);
      buttons()[1]!.click();
      expect(panels()[1]!.hidden).toBe(false);
    } finally {
      await act(async () => root.unmount());
    }
  });
});
