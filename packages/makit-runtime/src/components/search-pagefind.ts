export interface PagefindResultData {
  url: string;
  plain_excerpt: string;
  meta: { title?: string };
}

export interface PagefindModule {
  init(): Promise<void>;
  destroy(): Promise<void>;
  search(query: string): Promise<{ results: { data(): Promise<PagefindResultData> }[] }>;
}

/**
 * Pagefind keeps one search instance per loaded bundle and picks its language
 * index from `<html lang>` when that instance is created, so after a
 * client-side locale switch it would keep searching the first locale's index.
 * The returned loader re-creates the instance whenever the document language
 * has changed since it was last initialized.
 *
 * Calls are serialized so overlapping searches never destroy an instance
 * twice or initialize it with a stale language. A failed import is not cached:
 * the next call retries it.
 */
export function createPagefindLoader(
  importBundle: () => Promise<PagefindModule>,
  readLanguage: () => string,
): () => Promise<PagefindModule> {
  let state: Promise<{ pagefind: PagefindModule; language: string }> | undefined;

  return () => {
    const previous = state;
    const next = (async () => {
      const loaded = await previous?.catch(() => undefined);
      const pagefind = loaded?.pagefind ?? (await importBundle());
      // Read after waiting for earlier calls so the language recorded here is
      // the one Pagefind sees when `init()` creates its instance.
      const language = readLanguage();
      if (loaded?.language !== language) {
        if (loaded) await pagefind.destroy();
        await pagefind.init();
      }
      return { pagefind, language };
    })();
    state = next;
    return next.then(({ pagefind }) => pagefind);
  };
}
