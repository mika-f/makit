import { describe, expect, it, vi } from "vitest";
import { createPagefindLoader, type PagefindModule } from "./search-pagefind.js";

function fakePagefind() {
  const calls: string[] = [];
  const pagefind: PagefindModule = {
    init: vi.fn(async () => void calls.push("init")),
    destroy: vi.fn(async () => void calls.push("destroy")),
    search: vi.fn(async () => ({ results: [] })),
  };
  return { pagefind, calls };
}

describe("createPagefindLoader", () => {
  it("imports and initializes the bundle once while the language is unchanged", async () => {
    const { pagefind, calls } = fakePagefind();
    const importBundle = vi.fn(async () => pagefind);
    const load = createPagefindLoader(importBundle, () => "en-US");

    expect(await load()).toBe(pagefind);
    expect(await load()).toBe(pagefind);

    expect(importBundle).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(["init"]);
  });

  it("re-creates the instance after the document language changes", async () => {
    const { pagefind, calls } = fakePagefind();
    let language = "en-US";
    const load = createPagefindLoader(
      async () => pagefind,
      () => language,
    );

    await load();
    language = "ja-JP";
    await load();
    await load();
    language = "en-US";
    await load();

    expect(calls).toEqual(["init", "destroy", "init", "destroy", "init"]);
  });

  it("re-creates the instance once for overlapping calls after a switch", async () => {
    const { pagefind, calls } = fakePagefind();
    let language = "en-US";
    const load = createPagefindLoader(
      async () => pagefind,
      () => language,
    );

    await load();
    language = "ja-JP";
    await Promise.all([load(), load(), load()]);

    expect(calls).toEqual(["init", "destroy", "init"]);
  });

  it("initializes a pending first load with the language current when it runs", async () => {
    const { pagefind, calls } = fakePagefind();
    let language = "en-US";
    const load = createPagefindLoader(
      async () => pagefind,
      () => language,
    );

    const first = load();
    language = "ja-JP";
    await Promise.all([first, load()]);

    expect(calls).toEqual(["init"]);
  });

  it("retries the import after a failure", async () => {
    const { pagefind, calls } = fakePagefind();
    const importBundle = vi
      .fn<() => Promise<PagefindModule>>()
      .mockRejectedValueOnce(new Error("missing bundle"))
      .mockResolvedValue(pagefind);
    const load = createPagefindLoader(importBundle, () => "en-US");

    await expect(load()).rejects.toThrow("missing bundle");
    expect(await load()).toBe(pagefind);

    expect(importBundle).toHaveBeenCalledTimes(2);
    expect(calls).toEqual(["init"]);
  });
});
