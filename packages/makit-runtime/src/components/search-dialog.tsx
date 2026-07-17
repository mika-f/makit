"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SearchEntry } from "../data/types.js";

interface PagefindResultData {
  url: string;
  plain_excerpt: string;
  meta: { title?: string };
}

interface PagefindModule {
  init(): Promise<void>;
  search(query: string): Promise<{ results: { data(): Promise<PagefindResultData> }[] }>;
}

interface SearchResult {
  title: string;
  route: string;
  excerpt?: string;
}

function SearchIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function scoreEntry(entry: SearchEntry, query: string): number {
  const title = entry.title.toLocaleLowerCase();
  const headings = entry.headings.join(" ").toLocaleLowerCase();
  const content = entry.content.toLocaleLowerCase();
  if (title === query) return 100;
  if (title.startsWith(query)) return 80;
  if (title.includes(query)) return 60;
  if (headings.includes(query)) return 30;
  if (content.includes(query)) return 10;
  return 0;
}

export function SearchDialog({
  entries,
  pagefindEnabled,
  pagefindBundlePath,
}: {
  entries: readonly SearchEntry[];
  /** Pagefind is generated only by the production static build. */
  pagefindEnabled: boolean;
  pagefindBundlePath: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pagefindResults, setPagefindResults] = useState<SearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pagefindRef = useRef<PagefindModule | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    const normalized = query.trim();
    if (!normalized) {
      setPagefindResults(null);
      setIsSearching(false);
      return;
    }
    if (!pagefindEnabled) {
      setPagefindResults(null);
      setIsSearching(false);
      return;
    }

    let active = true;
    setIsSearching(true);
    void (async () => {
      try {
        const pagefind =
          pagefindRef.current ??
          ((await import(
            /* webpackIgnore: true */ `${pagefindBundlePath}pagefind.js`
          )) as PagefindModule);
        pagefindRef.current = pagefind;
        await pagefind.init();
        const search = await pagefind.search(normalized);
        const data = await Promise.all(search.results.slice(0, 8).map((result) => result.data()));
        if (active) {
          setPagefindResults(
            data.map((result) => ({
              title: result.meta.title ?? result.url,
              route: result.url,
              excerpt: result.plain_excerpt,
            })),
          );
        }
      } catch {
        // Pagefind is only emitted by production builds. The local corpus
        // keeps search useful during `makit dev` and if the bundle is absent.
        if (active) setPagefindResults(null);
      } finally {
        if (active) setIsSearching(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [pagefindBundlePath, pagefindEnabled, query]);

  const fallbackResults = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return entries.slice(0, 6);
    return entries
      .map((entry) => ({ entry, score: scoreEntry(entry, normalized) }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
      .slice(0, 8)
      .map((result) => result.entry);
  }, [entries, query]);

  const results: SearchResult[] =
    pagefindResults ??
    fallbackResults.map((entry) => ({
      title: entry.title,
      route: entry.route,
      excerpt: entry.headings.length > 1 ? entry.headings.slice(1, 4).join(" · ") : undefined,
    }));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-9 items-center gap-2 rounded-lg border border-[var(--makit-color-border)] bg-[var(--makit-color-surface)] px-2.5 text-sm text-[var(--makit-color-subtle)] shadow-sm transition hover:border-[var(--makit-color-border-strong)] hover:text-[var(--makit-color-foreground)] sm:w-52"
        aria-label="Search documentation"
      >
        <SearchIcon />
        <span className="hidden flex-1 text-left sm:block">Search</span>
        <kbd className="hidden rounded border border-[var(--makit-color-border)] bg-[var(--makit-color-muted)] px-1.5 py-0.5 font-sans text-[10px] text-[var(--makit-color-subtle)] sm:block">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 px-4 pt-[12vh] backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Search documentation"
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--makit-color-border)] bg-[var(--makit-color-background)] shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-[var(--makit-color-border)] px-4">
              <SearchIcon className="h-5 w-5 shrink-0 text-[var(--makit-color-subtle)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search documentation…"
                className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[var(--makit-color-subtle)]"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-[var(--makit-color-border)] px-2 py-1 text-xs text-[var(--makit-color-subtle)] hover:text-[var(--makit-color-foreground)]"
              >
                Esc
              </button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {results.length > 0 ? (
                <ul>
                  {results.map((entry) => (
                    <li key={entry.route}>
                      <a
                        href={entry.route}
                        className="group flex items-center justify-between gap-4 rounded-xl px-3 py-3 transition hover:bg-[var(--makit-color-muted)]"
                      >
                        <span className="min-w-0">
                          <span className="block font-medium">{entry.title}</span>
                          {entry.excerpt && (
                            <span className="mt-0.5 block truncate text-xs text-[var(--makit-color-subtle)]">
                              {entry.excerpt}
                            </span>
                          )}
                        </span>
                        <span className="text-[var(--makit-color-subtle)] transition group-hover:translate-x-0.5 group-hover:text-[var(--makit-color-accent)]">
                          →
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : isSearching ? (
                <p className="px-3 py-10 text-center text-sm text-[var(--makit-color-subtle)]">
                  Searching…
                </p>
              ) : (
                <p className="px-3 py-10 text-center text-sm text-[var(--makit-color-subtle)]">
                  No results for “{query}”
                </p>
              )}
            </div>
            <div className="border-t border-[var(--makit-color-border)] px-4 py-2 text-[11px] text-[var(--makit-color-subtle)]">
              Search across {entries.length} pages
            </div>
          </section>
        </div>
      )}
    </>
  );
}
