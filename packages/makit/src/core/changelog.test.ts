import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import { buildPagesForTest } from "../testing/fixtures.js";
import type { ResolvedChangelogConfig, ResolvedConfig } from "../types/resolved-config.js";
import {
  ChangelogFetcher,
  filterReleases,
  formatReleaseDate,
  mergeChangelog,
  renderChangelogMarkdown,
  resolvePageChangelog,
  shiftHeadings,
  sortReleases,
  type ChangelogRelease,
  type FetchLike,
} from "./changelog.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "makit-changelog-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function configFor(root: string, extra: Record<string, unknown> = {}): ResolvedConfig {
  return resolveConfig(
    { title: "Test", ...extra },
    { root, configPath: join(root, "makit.config.ts") },
  );
}

const defaults = (): ResolvedChangelogConfig => configFor(dir).changelog;

function release(overrides: Partial<ChangelogRelease> = {}): ChangelogRelease {
  return {
    tag: "v1.0.0",
    name: "v1.0.0",
    url: "https://github.com/mika-f/makit/releases/tag/v1.0.0",
    publishedAt: "2026-05-01T00:00:00Z",
    prerelease: false,
    body: "Initial release.",
    ...overrides,
  };
}

/** A `fetch` stub returning one JSON page of releases, counting calls. */
function stubFetch(
  pages: unknown[][],
  headers: Record<string, string> = {},
): FetchLike & { calls: string[] } {
  const calls: string[] = [];
  const impl: FetchLike = (url) => {
    calls.push(url);
    const page = Number(new URL(url).searchParams.get("page") ?? "1");
    return Promise.resolve(
      new Response(JSON.stringify(pages[page - 1] ?? []), {
        status: 200,
        headers: { "content-type": "application/json", ...headers },
      }),
    );
  };
  return Object.assign(impl, { calls });
}

function rawRelease(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    tag_name: "v1.0.0",
    name: "v1.0.0",
    html_url: "https://github.com/mika-f/makit/releases/tag/v1.0.0",
    published_at: "2026-05-01T00:00:00Z",
    prerelease: false,
    draft: false,
    body: "Initial release.",
    ...overrides,
  };
}

describe("resolvePageChangelog", () => {
  it("expands the string shorthand into the site-wide defaults", () => {
    const resolved = resolvePageChangelog("mika-f/makit", defaults(), "page.md");
    expect(resolved).toMatchObject({
      repository: "mika-f/makit",
      limit: 30,
      prereleases: true,
      headingLevel: 2,
    });
  });

  it("lets the page override the site-wide defaults", () => {
    const resolved = resolvePageChangelog(
      { repository: "mika-f/makit", limit: 5, prereleases: false, headingLevel: 3 },
      defaults(),
      "page.md",
    );
    expect(resolved).toMatchObject({ limit: 5, prereleases: false, headingLevel: 3 });
  });

  it("rejects a repository that is not in owner/repository form", () => {
    expect(() =>
      resolvePageChangelog("https://github.com/mika-f/makit", defaults(), "page.md"),
    ).toThrowError(/invalid `changelog` repository/);
  });

  it("rejects an invalid tagPattern", () => {
    expect(() =>
      resolvePageChangelog({ repository: "mika-f/makit", tagPattern: "([" }, defaults(), "page.md"),
    ).toThrowError(/invalid `changelog.tagPattern`/);
  });

  it("rejects an unparseable since date", () => {
    expect(() =>
      resolvePageChangelog(
        { repository: "mika-f/makit", since: "last tuesday" },
        defaults(),
        "page.md",
      ),
    ).toThrowError(/invalid `changelog.since`/);
  });

  it("rejects an out-of-range headingLevel", () => {
    expect(() =>
      resolvePageChangelog({ repository: "mika-f/makit", headingLevel: 6 }, defaults(), "page.md"),
    ).toThrowError(/invalid `changelog.headingLevel`/);
  });
});

describe("filterReleases", () => {
  const releases = [
    release({ tag: "v2.0.0", publishedAt: "2026-05-01T00:00:00Z" }),
    release({ tag: "v2.0.0-rc.1", prerelease: true, publishedAt: "2026-04-01T00:00:00Z" }),
    release({ tag: "other@1.0.0", publishedAt: "2026-03-01T00:00:00Z" }),
    release({ tag: "v1.0.0", publishedAt: "2026-01-01T00:00:00Z" }),
  ];

  it("drops pre-releases when prereleases is false", () => {
    const options = resolvePageChangelog(
      { repository: "mika-f/makit", prereleases: false },
      defaults(),
      "page.md",
    );
    expect(filterReleases(releases, options).map((entry) => entry.tag)).toEqual([
      "v2.0.0",
      "other@1.0.0",
      "v1.0.0",
    ]);
  });

  it("keeps only tags matching tagPattern", () => {
    const options = resolvePageChangelog(
      { repository: "mika-f/makit", tagPattern: "^v" },
      defaults(),
      "page.md",
    );
    expect(filterReleases(releases, options).map((entry) => entry.tag)).toEqual([
      "v2.0.0",
      "v2.0.0-rc.1",
      "v1.0.0",
    ]);
  });

  it("drops releases published before since", () => {
    const options = resolvePageChangelog(
      { repository: "mika-f/makit", since: "2026-04-01" },
      defaults(),
      "page.md",
    );
    expect(filterReleases(releases, options).map((entry) => entry.tag)).toEqual([
      "v2.0.0",
      "v2.0.0-rc.1",
    ]);
  });

  it("applies limit after the other filters", () => {
    const options = resolvePageChangelog(
      { repository: "mika-f/makit", prereleases: false, limit: 1 },
      defaults(),
      "page.md",
    );
    expect(filterReleases(releases, options).map((entry) => entry.tag)).toEqual(["v2.0.0"]);
  });
});

describe("sortReleases", () => {
  function order(tags: Array<[tag: string, publishedAt?: string]>): string[] {
    const releases = tags.map(([tag, publishedAt]) => release({ tag, publishedAt }));
    return sortReleases(releases).map((entry) => entry.tag);
  }

  it("orders by version rather than by publication date", () => {
    expect(
      order([
        ["v1.9.0", "2026-05-01T00:00:00Z"],
        ["v1.10.0", "2026-02-01T00:00:00Z"],
        ["v2.0.0", "2026-03-01T00:00:00Z"],
      ]),
    ).toEqual(["v2.0.0", "v1.10.0", "v1.9.0"]);
  });

  it("places a pre-release below the release it leads to", () => {
    expect(order([["v2.0.0-rc.1"], ["v2.0.0"], ["v2.0.0-rc.2"], ["v2.0.0-beta.1"]])).toEqual([
      "v2.0.0",
      "v2.0.0-rc.2",
      "v2.0.0-rc.1",
      "v2.0.0-beta.1",
    ]);
  });

  it("reads versions out of prefixed and shortened tags", () => {
    expect(order([["makit@1.2.0"], ["v1.3"], ["1.2.1"], ["@scope/pkg@1.4.0"]])).toEqual([
      "@scope/pkg@1.4.0",
      "v1.3",
      "1.2.1",
      "makit@1.2.0",
    ]);
  });

  it("sorts tags without a readable version last, newest first", () => {
    expect(
      order([
        ["nightly", "2026-01-01T00:00:00Z"],
        ["v1.0.0", "2026-02-01T00:00:00Z"],
        ["release-candidate", "2026-04-01T00:00:00Z"],
      ]),
    ).toEqual(["v1.0.0", "release-candidate", "nightly"]);
  });

  it("breaks ties on equal versions with the publication date", () => {
    expect(
      order([
        ["a@1.0.0", "2026-01-01T00:00:00Z"],
        ["b@1.0.0", "2026-03-01T00:00:00Z"],
      ]),
    ).toEqual(["b@1.0.0", "a@1.0.0"]);
  });
});

describe("shiftHeadings", () => {
  it("re-levels a body so its shallowest heading sits below the release heading", () => {
    expect(shiftHeadings("# Features\n\n## Details\n", 2)).toBe("### Features\n\n#### Details\n");
  });

  it("keeps the relative depth when the body already starts deeper", () => {
    expect(shiftHeadings("### Features\n#### Details\n", 2)).toBe("### Features\n#### Details\n");
  });

  it("clamps shifted headings at level 6", () => {
    expect(shiftHeadings("# A\n##### B\n###### C\n", 5)).toBe("###### A\n###### B\n###### C\n");
  });

  it("leaves headings inside fenced code blocks alone", () => {
    const body = "# Title\n\n```md\n# Not a heading\n```\n";
    expect(shiftHeadings(body, 2)).toBe("### Title\n\n```md\n# Not a heading\n```\n");
  });

  it("returns the body unchanged when it has no headings", () => {
    expect(shiftHeadings("Just text.\n", 2)).toBe("Just text.\n");
  });
});

describe("renderChangelogMarkdown", () => {
  const options = {
    headingLevel: 2,
    prereleaseLabel: "Pre-release",
    emptyLabel: "No releases yet.",
    dateStyle: "iso" as const,
    locale: "en-US",
  };

  it("renders a heading, a meta line, and the shifted body", () => {
    const markdown = renderChangelogMarkdown([release({ body: "# Added\n\nStuff." })], options);
    expect(markdown).toBe(
      "## v1.0.0\n\n" +
        "[v1.0.0](https://github.com/mika-f/makit/releases/tag/v1.0.0) · 2026-05-01\n\n" +
        "### Added\n\nStuff.\n",
    );
  });

  it("marks pre-releases", () => {
    const markdown = renderChangelogMarkdown([release({ prerelease: true, body: "" })], options);
    expect(markdown).toContain("**Pre-release** · [v1.0.0]");
  });

  it("uses the release name as the heading and collapses whitespace in it", () => {
    const markdown = renderChangelogMarkdown(
      [release({ name: "Makit\n0.5.0", body: "" })],
      options,
    );
    expect(markdown.startsWith("## Makit 0.5.0\n")).toBe(true);
  });

  it("falls back to the tag when the release has no name", () => {
    const markdown = renderChangelogMarkdown([release({ name: undefined, body: "" })], options);
    expect(markdown.startsWith("## v1.0.0\n")).toBe(true);
  });

  it("renders the empty label when there are no releases", () => {
    expect(renderChangelogMarkdown([], options)).toBe("No releases yet.\n");
  });
});

describe("mergeChangelog", () => {
  it("replaces the marker line", () => {
    const body = "Intro.\n\n<!-- makit:changelog -->\n\nOutro.\n";
    expect(mergeChangelog(body, "## v1.0.0\n")).toBe("Intro.\n\n## v1.0.0\n\nOutro.\n");
  });

  it("replaces only the first marker", () => {
    const body = "<!-- makit:changelog -->\n\n<!-- makit:changelog -->\n";
    expect(mergeChangelog(body, "GENERATED")).toBe("GENERATED\n\n<!-- makit:changelog -->\n");
  });

  it("ignores a marker inside a fenced code block", () => {
    const body = "```md\n<!-- makit:changelog -->\n```\n";
    expect(mergeChangelog(body, "GENERATED")).toBe(
      "```md\n<!-- makit:changelog -->\n```\n\nGENERATED",
    );
  });

  it("appends to the body when there is no marker", () => {
    expect(mergeChangelog("Intro.\n", "## v1.0.0\n")).toBe("Intro.\n\n## v1.0.0\n");
  });

  it("returns the generated Markdown alone for an empty body", () => {
    expect(mergeChangelog("\n", "## v1.0.0\n")).toBe("## v1.0.0\n");
  });
});

describe("formatReleaseDate", () => {
  it("formats ISO dates without a locale", () => {
    expect(formatReleaseDate("2026-05-01T12:00:00Z", "iso", "ja-JP")).toBe("2026-05-01");
  });

  it("formats using the page locale", () => {
    expect(formatReleaseDate("2026-05-01T12:00:00Z", "medium", "en-US")).toContain("2026");
  });

  it("returns undefined for an unparseable timestamp", () => {
    expect(formatReleaseDate("not a date", "iso", "en-US")).toBeUndefined();
  });
});

describe("ChangelogFetcher", () => {
  function fetcherWith(fetchImpl: FetchLike, overrides: Partial<ResolvedChangelogConfig> = {}) {
    return new ChangelogFetcher({ ...defaults(), ...overrides }, join(dir, "cache"), fetchImpl);
  }

  it("drops draft releases", async () => {
    const fetchImpl = stubFetch([
      [
        rawRelease({ tag_name: "v1.0.0", published_at: "2026-01-01T00:00:00Z" }),
        rawRelease({ tag_name: "v1.1.0-draft", draft: true }),
        rawRelease({ tag_name: "v2.0.0", published_at: "2026-05-01T00:00:00Z" }),
      ],
    ]);
    const { releases } = await fetcherWith(fetchImpl).fetch("mika-f/makit", 30);
    expect(releases.map((entry) => entry.tag)).toEqual(["v1.0.0", "v2.0.0"]);
  });

  it("fetches a repository once per build pass", async () => {
    const fetchImpl = stubFetch([[rawRelease()]]);
    const fetcher = fetcherWith(fetchImpl);
    await fetcher.fetch("mika-f/makit", 30);
    await fetcher.fetch("mika-f/makit", 30);
    expect(fetchImpl.calls).toHaveLength(1);
  });

  it("reuses the on-disk cache inside the TTL", async () => {
    const first = stubFetch([[rawRelease()]]);
    await fetcherWith(first).fetch("mika-f/makit", 30);
    const second = stubFetch([[rawRelease()]]);
    const { releases } = await fetcherWith(second).fetch("mika-f/makit", 30);
    expect(second.calls).toHaveLength(0);
    expect(releases).toHaveLength(1);
  });

  it("revalidates with If-None-Match once the TTL expires", async () => {
    const first = stubFetch([[rawRelease()]], { etag: 'W/"abc"' });
    await fetcherWith(first).fetch("mika-f/makit", 30);

    const seen: Record<string, string>[] = [];
    const revalidate: FetchLike = (_url, init) => {
      seen.push(init.headers as Record<string, string>);
      return Promise.resolve(new Response(null, { status: 304 }));
    };
    const { releases, warning } = await fetcherWith(revalidate, { cacheTtl: 0 }).fetch(
      "mika-f/makit",
      30,
    );
    expect(seen[0]?.["If-None-Match"]).toBe('W/"abc"');
    expect(warning).toBeUndefined();
    expect(releases).toHaveLength(1);
  });

  it("falls back to stale cache and warns when the API fails", async () => {
    const first = stubFetch([[rawRelease()]]);
    await fetcherWith(first).fetch("mika-f/makit", 30);

    const failing: FetchLike = () => Promise.reject(new Error("network down"));
    const { releases, warning } = await fetcherWith(failing, { cacheTtl: 0 }).fetch(
      "mika-f/makit",
      30,
    );
    expect(releases).toHaveLength(1);
    expect(warning).toMatch(/network down/);
  });

  it("warns and returns nothing when the API fails with no cache", async () => {
    const failing: FetchLike = () =>
      Promise.resolve(new Response("nope", { status: 500, statusText: "Server Error" }));
    const { releases, warning } = await fetcherWith(failing).fetch("mika-f/makit", 30);
    expect(releases).toEqual([]);
    expect(warning).toMatch(/HTTP 500/);
  });

  it("mentions the token when GitHub reports a rate limit", async () => {
    const limited: FetchLike = () =>
      Promise.resolve(new Response("", { status: 403, headers: { "x-ratelimit-remaining": "0" } }));
    const { warning } = await fetcherWith(limited).fetch("mika-f/makit", 30);
    expect(warning).toMatch(/GITHUB_TOKEN/);
  });

  it("never hits the network in offline mode", async () => {
    const fetchImpl = stubFetch([[rawRelease()]]);
    const { releases, warning } = await fetcherWith(fetchImpl, { offline: true }).fetch(
      "mika-f/makit",
      30,
    );
    expect(fetchImpl.calls).toHaveLength(0);
    expect(releases).toEqual([]);
    expect(warning).toMatch(/offline/);
  });

  it("serves the cache regardless of age in offline mode", async () => {
    const first = stubFetch([[rawRelease()]]);
    await fetcherWith(first).fetch("mika-f/makit", 30);

    const fetchImpl = stubFetch([[rawRelease()]]);
    const { releases } = await fetcherWith(fetchImpl, { offline: true, cacheTtl: 0 }).fetch(
      "mika-f/makit",
      30,
    );
    expect(fetchImpl.calls).toHaveLength(0);
    expect(releases).toHaveLength(1);
  });

  it("sends the token when one is configured", async () => {
    const seen: Record<string, string>[] = [];
    const fetchImpl: FetchLike = (_url, init) => {
      seen.push(init.headers as Record<string, string>);
      return Promise.resolve(new Response("[]", { status: 200 }));
    };
    await fetcherWith(fetchImpl, { token: "secret" }).fetch("mika-f/makit", 30);
    expect(seen[0]?.Authorization).toBe("Bearer secret");
  });
});

describe("changelog pages", () => {
  async function write(relativePath: string, content: string): Promise<void> {
    const fullPath = join(dir, relativePath);
    await mkdir(join(fullPath, ".."), { recursive: true });
    await writeFile(fullPath, content, "utf-8");
  }

  function fetcherFor(releases: unknown[], config: ResolvedConfig): ChangelogFetcher {
    return new ChangelogFetcher(config.changelog, join(dir, "cache"), stubFetch([releases]));
  }

  it("renders releases declared through front matter", async () => {
    await write(
      "docs/changelog.md",
      "---\ntitle: Changelog\nchangelog: mika-f/makit\n---\n\nReleases:\n",
    );
    const config = configFor(dir, { changelog: { dateStyle: "iso" } });
    const { pages, diagnostics } = await buildPagesForTest(config, {
      changelogFetcher: fetcherFor([rawRelease({ body: "## Added\n\nNew stuff." })], config),
    });

    const page = pages[0]!;
    expect(page.html).toContain("v1.0.0");
    expect(page.html).toContain("New stuff.");
    // Release headings take part in the table of contents (CHANGELOG §7).
    expect(page.headings.map((heading) => heading.text)).toEqual(["v1.0.0", "Added"]);
    expect(page.headings.map((heading) => heading.depth)).toEqual([2, 3]);
    expect(diagnostics).toEqual([]);
  });

  it("honours the marker position", async () => {
    await write(
      "docs/changelog.md",
      "---\nchangelog: mika-f/makit\n---\n\n<!-- makit:changelog -->\n\nAfter the releases.\n",
    );
    const config = configFor(dir);
    const { pages } = await buildPagesForTest(config, {
      changelogFetcher: fetcherFor([rawRelease({ body: "" })], config),
    });
    expect(pages[0]!.html.indexOf("v1.0.0")).toBeLessThan(
      pages[0]!.html.indexOf("After the releases."),
    );
  });

  it("reports changelog-empty when nothing matches the filters", async () => {
    await write("docs/changelog.md", "---\nchangelog: mika-f/makit\n---\n");
    const config = configFor(dir, { changelog: { labels: { empty: "Nothing yet." } } });
    const { pages, diagnostics } = await buildPagesForTest(config, {
      changelogFetcher: fetcherFor([], config),
    });
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain("changelog-empty");
    expect(pages[0]!.html).toContain("Nothing yet.");
  });

  it("reports changelog-fetch-failed without stopping the build", async () => {
    await write("docs/changelog.md", "---\nchangelog: mika-f/makit\n---\n");
    const config = configFor(dir);
    const failing = new ChangelogFetcher(config.changelog, join(dir, "cache"), () =>
      Promise.reject(new Error("network down")),
    );
    const { pages, diagnostics } = await buildPagesForTest(config, { changelogFetcher: failing });
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain("changelog-fetch-failed");
    expect(pages).toHaveLength(1);
  });

  it("leaves the body untouched when the feature is disabled", async () => {
    await write(
      "docs/changelog.md",
      "---\nchangelog: mika-f/makit\n---\n\n<!-- makit:changelog -->\n\nBody.\n",
    );
    const config = configFor(dir, { changelog: { enabled: false } });
    const fetchImpl = stubFetch([[rawRelease()]]);
    const { pages, diagnostics } = await buildPagesForTest(config, {
      changelogFetcher: new ChangelogFetcher(config.changelog, join(dir, "cache"), fetchImpl),
    });
    expect(fetchImpl.calls).toHaveLength(0);
    expect(pages[0]!.html).not.toContain("v1.0.0");
    expect(diagnostics).toEqual([]);
  });

  it("fails the build on an invalid repository", async () => {
    await write("docs/changelog.md", "---\nchangelog: not-a-repo\n---\n");
    await expect(buildPagesForTest(configFor(dir))).rejects.toMatchObject({
      code: "changelog-invalid-repository",
    });
  });

  it("does not touch the network for pages without a changelog", async () => {
    await write("docs/index.md", "# Home\n");
    const config = configFor(dir);
    const fetchImpl = stubFetch([[rawRelease()]]);
    await buildPagesForTest(config, {
      changelogFetcher: new ChangelogFetcher(config.changelog, join(dir, "cache"), fetchImpl),
    });
    expect(fetchImpl.calls).toHaveLength(0);
  });

  it("shares one fetch across locales", async () => {
    await write("docs/en-us/changelog.md", "---\nchangelog: mika-f/makit\n---\n");
    await write("docs/ja-jp/changelog.md", "---\nchangelog: mika-f/makit\n---\n");
    const config = configFor(dir, {
      i18n: {
        defaultLocale: "en-US",
        locales: [{ locale: "en-US" }, { locale: "ja-JP" }],
      },
    });
    const fetchImpl = stubFetch([[rawRelease()]]);
    const { pages } = await buildPagesForTest(config, {
      changelogFetcher: new ChangelogFetcher(config.changelog, join(dir, "cache"), fetchImpl),
    });
    expect(pages).toHaveLength(2);
    expect(fetchImpl.calls).toHaveLength(1);
  });
});

describe("MAKIT_OFFLINE", () => {
  it("turns on offline mode from the environment", () => {
    vi.stubEnv("MAKIT_OFFLINE", "1");
    expect(configFor(dir).changelog.offline).toBe(true);
    vi.unstubAllEnvs();
  });
});
