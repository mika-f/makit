import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CHANGELOG_MARKER } from "../config/defaults.js";
import type { PageChangelog } from "../metadata/types.js";
import type { ChangelogDateStyle } from "../types/config.js";
import type { ResolvedChangelogConfig, ResolvedConfig } from "../types/resolved-config.js";
import { MakitError } from "./errors.js";
import type { Diagnostic } from "./validation.js";

/** GitHub returns at most 100 releases per request; cap the paging (CHANGELOG §4). */
const PER_PAGE = 100;
const MAX_PAGES = 5;
const REPOSITORY_RE = /^[^/\s]+\/[^/\s]+$/;

/** The subset of a GitHub release Makit renders and caches (CHANGELOG §4). */
export interface ChangelogRelease {
  tag: string;
  name?: string;
  url: string;
  /** ISO 8601 timestamp; `published_at`, falling back to `created_at`. */
  publishedAt?: string;
  prerelease: boolean;
  body: string;
}

/** A page's `changelog` metadata, merged with the site-wide defaults (CHANGELOG §8). */
export interface ResolvedPageChangelog {
  repository: string;
  limit: number;
  prereleases: boolean;
  headingLevel: number;
  tagPattern?: RegExp;
  /** Epoch milliseconds; releases published before this are dropped. */
  since?: number;
}

/** Splits `owner/repository`, rejecting URLs and other shapes (CHANGELOG §3). */
export function parseRepository(repository: string, sourcePath: string): string {
  const value = repository.trim();
  if (!REPOSITORY_RE.test(value)) {
    throw new MakitError(
      "changelog-invalid-repository",
      `${sourcePath} has an invalid \`changelog\` repository "${repository}". ` +
        'Use the "owner/repository" form (e.g. "mika-f/makit").',
    );
  }
  return value;
}

function requireInteger(
  value: number | undefined,
  field: string,
  min: number,
  max: number,
  sourcePath: string,
  fallback: number,
): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new MakitError(
      "changelog-invalid-option",
      `${sourcePath} has an invalid \`changelog.${field}\` (${value}). Expected an integer between ${min} and ${max}.`,
    );
  }
  return value;
}

/**
 * Merges a page's `changelog` metadata with the site-wide defaults and
 * validates it (CHANGELOG §8, §18). Every invalid option is a build error
 * rather than a warning: the page would otherwise silently render the wrong
 * releases.
 */
export function resolvePageChangelog(
  changelog: PageChangelog,
  defaults: ResolvedChangelogConfig,
  sourcePath: string,
): ResolvedPageChangelog {
  const page = typeof changelog === "string" ? { repository: changelog } : changelog;

  let tagPattern: RegExp | undefined;
  if (page.tagPattern !== undefined) {
    try {
      tagPattern = new RegExp(page.tagPattern);
    } catch (error) {
      throw new MakitError(
        "changelog-invalid-tag-pattern",
        `${sourcePath} has an invalid \`changelog.tagPattern\` (${JSON.stringify(page.tagPattern)}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  let since: number | undefined;
  if (page.since !== undefined) {
    since = Date.parse(page.since);
    if (Number.isNaN(since)) {
      throw new MakitError(
        "changelog-invalid-option",
        `${sourcePath} has an invalid \`changelog.since\` (${JSON.stringify(page.since)}). Expected an ISO 8601 date.`,
      );
    }
  }

  return {
    repository: parseRepository(page.repository, sourcePath),
    limit: requireInteger(page.limit, "limit", 1, 500, sourcePath, defaults.limit),
    prereleases: page.prereleases ?? defaults.prereleases,
    headingLevel: requireInteger(
      page.headingLevel,
      "headingLevel",
      1,
      5,
      sourcePath,
      defaults.headingLevel,
    ),
    tagPattern,
    since,
  };
}

/**
 * Applies `prereleases`, `tagPattern`, `since`, then `limit` — in that order
 * (CHANGELOG §8). Sorting happens before `limit` so the page keeps the highest
 * versions, not the ones GitHub happened to return first.
 */
export function filterReleases(
  releases: readonly ChangelogRelease[],
  options: ResolvedPageChangelog,
): ChangelogRelease[] {
  const filtered = releases
    .filter((release) => options.prereleases || !release.prerelease)
    .filter((release) => !options.tagPattern || options.tagPattern.test(release.tag))
    .filter((release) => {
      if (options.since === undefined) return true;
      if (!release.publishedAt) return false;
      return Date.parse(release.publishedAt) >= options.since;
    });

  return sortReleases(filtered).slice(0, options.limit);
}

// #region ordering

interface ParsedVersion {
  /** Release identifiers (`major`, `minor`, `patch`, …) as read from the tag. */
  numbers: number[];
  /** Dot-separated pre-release identifiers, if the tag has any. */
  prerelease?: string[];
}

/**
 * Reads the version out of a tag name (CHANGELOG §4). Accepts the shapes tags
 * take in practice — `1.2.3`, `v1.2.3`, `v1.2`, `@scope/pkg@1.2.3-rc.1+build`
 * — and returns `undefined` for anything else, e.g. a date-based tag.
 */
const VERSION_RE = /^(?:.*?[@/-])?[vV]?(\d+(?:\.\d+)*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

function parseVersion(tag: string): ParsedVersion | undefined {
  const match = VERSION_RE.exec(tag.trim());
  if (!match) return undefined;
  return {
    numbers: match[1]!.split(".").map(Number),
    prerelease: match[2]?.split("."),
  };
}

/** Compares pre-release identifiers per semver §11.4; a release outranks its pre-releases. */
function comparePrerelease(left: string[] | undefined, right: string[] | undefined): number {
  if (!left && !right) return 0;
  // An absent pre-release means the final release, which is the greater version.
  if (!left) return 1;
  if (!right) return -1;

  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const a = left[index];
    const b = right[index];
    // A shorter set of identifiers is the lower version (`1.0.0-rc` < `1.0.0-rc.1`).
    if (a === undefined) return -1;
    if (b === undefined) return 1;

    const aNumeric = /^\d+$/.test(a);
    const bNumeric = /^\d+$/.test(b);
    if (aNumeric && bNumeric) {
      if (Number(a) !== Number(b)) return Number(a) - Number(b);
      continue;
    }
    if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
    if (a !== b) return a < b ? -1 : 1;
  }

  return 0;
}

function compareVersions(left: ParsedVersion, right: ParsedVersion): number {
  for (let index = 0; index < Math.max(left.numbers.length, right.numbers.length); index += 1) {
    // A missing component counts as 0, so `v1.2` and `v1.2.0` compare equal.
    const diff = (left.numbers[index] ?? 0) - (right.numbers[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return comparePrerelease(left.prerelease, right.prerelease);
}

function releaseTimestamp(release: ChangelogRelease): number {
  if (!release.publishedAt) return 0;
  const timestamp = Date.parse(release.publishedAt);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

/**
 * Orders releases by version, highest first (CHANGELOG §4). Tags whose version
 * Makit cannot read sort after the ones it can, and the publication date breaks
 * ties — so a repository with non-version tags still reads newest-first.
 */
export function sortReleases(releases: readonly ChangelogRelease[]): ChangelogRelease[] {
  return releases
    .map((release) => ({ release, version: parseVersion(release.tag) }))
    .sort((a, b) => {
      if (a.version && b.version) {
        const byVersion = compareVersions(b.version, a.version);
        if (byVersion !== 0) return byVersion;
      } else if (a.version || b.version) {
        return a.version ? -1 : 1;
      }
      return releaseTimestamp(b.release) - releaseTimestamp(a.release);
    })
    .map((entry) => entry.release);
}

// #endregion

// #region markdown generation

interface FenceState {
  char: string;
  length: number;
}

function fenceDelimiter(line: string): FenceState | undefined {
  const match = /^ {0,3}(`{3,}|~{3,})/.exec(line);
  if (!match) return undefined;
  const marker = match[1]!;
  return { char: marker[0]!, length: marker.length };
}

/**
 * Walks lines while tracking fenced code blocks, so markers and headings
 * inside a fence are left alone (CHANGELOG §6, §7).
 */
function mapOutsideFences(
  markdown: string,
  transform: (line: string, index: number) => string,
): string {
  const lines = markdown.split("\n");
  let fence: FenceState | undefined;

  const result = lines.map((line, index) => {
    const delimiter = fenceDelimiter(line);
    if (fence) {
      // A closing fence uses the same character and is at least as long.
      if (delimiter && delimiter.char === fence.char && delimiter.length >= fence.length) {
        fence = undefined;
      }
      return line;
    }
    if (delimiter) {
      fence = delimiter;
      return line;
    }
    return transform(line, index);
  });

  return result.join("\n");
}

const HEADING_RE = /^ {0,3}(#{1,6})(\s|$)/;

/**
 * Re-levels a release body so its shallowest heading sits one level below
 * the release's own heading (CHANGELOG §7). Levels are clamped to 6.
 */
export function shiftHeadings(markdown: string, headingLevel: number): string {
  let minDepth: number | undefined;
  mapOutsideFences(markdown, (line) => {
    const match = HEADING_RE.exec(line);
    if (match) {
      const depth = match[1]!.length;
      if (minDepth === undefined || depth < minDepth) minDepth = depth;
    }
    return line;
  });

  if (minDepth === undefined) return markdown;
  const delta = headingLevel + 1 - minDepth;
  if (delta === 0) return markdown;

  return mapOutsideFences(markdown, (line) => {
    const match = HEADING_RE.exec(line);
    if (!match) return line;
    const depth = match[1]!.length;
    const shifted = Math.min(6, Math.max(1, depth + delta));
    return line.replace(/#{1,6}/, "#".repeat(shifted));
  });
}

export interface RenderChangelogOptions {
  headingLevel: number;
  prereleaseLabel: string;
  emptyLabel: string;
  dateStyle: ChangelogDateStyle;
  /** BCP-47 tag used to format dates (the page's locale). */
  locale: string;
}

/** Formats a release date for one locale (CHANGELOG §9). */
export function formatReleaseDate(
  isoDate: string,
  dateStyle: ChangelogDateStyle,
  locale: string,
): string | undefined {
  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) return undefined;
  const date = new Date(timestamp);
  if (dateStyle === "iso") return date.toISOString().slice(0, 10);
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle, timeZone: "UTC" }).format(date);
  } catch {
    // An unknown locale tag must not fail the build.
    return date.toISOString().slice(0, 10);
  }
}

/** Collapses whitespace so a multi-line release name can't break the heading. */
function headingText(release: ChangelogRelease): string {
  const title = (release.name ?? "").replace(/\s+/g, " ").trim();
  return title === "" ? release.tag : title;
}

/** Renders the release list as Markdown, ready to be merged into a page body (CHANGELOG §5). */
export function renderChangelogMarkdown(
  releases: readonly ChangelogRelease[],
  options: RenderChangelogOptions,
): string {
  if (releases.length === 0) return `${options.emptyLabel}\n`;

  const hashes = "#".repeat(options.headingLevel);
  const blocks = releases.map((release) => {
    const meta: string[] = [];
    if (release.prerelease) meta.push(`**${options.prereleaseLabel}**`);
    meta.push(`[${release.tag}](${release.url})`);
    const date =
      release.publishedAt &&
      formatReleaseDate(release.publishedAt, options.dateStyle, options.locale);
    if (date) meta.push(date);

    const body = release.body.trim();
    const sections = [`${hashes} ${headingText(release)}`, meta.join(" · ")];
    if (body !== "") sections.push(shiftHeadings(body, options.headingLevel));
    return sections.join("\n\n");
  });

  return `${blocks.join("\n\n")}\n`;
}

/**
 * Puts the generated Markdown where the page asked for it: at the first
 * `<!-- makit:changelog -->` marker, or appended to the body (CHANGELOG §6).
 */
export function mergeChangelog(body: string, changelogMarkdown: string): string {
  let replaced = false;
  const merged = mapOutsideFences(body, (line) => {
    if (replaced || line.trim() !== CHANGELOG_MARKER) return line;
    replaced = true;
    return changelogMarkdown.trimEnd();
  });

  if (replaced) return merged;
  const trimmed = body.trimEnd();
  return trimmed === "" ? changelogMarkdown : `${trimmed}\n\n${changelogMarkdown}`;
}

// #endregion

// #region fetching

interface CacheEntry {
  fetchedAt: number;
  etag?: string;
  /** Number of releases stored; a page needing more triggers a refetch. */
  count: number;
  /** Whether the repository has no further releases beyond `count`. */
  complete: boolean;
  releases: ChangelogRelease[];
}

interface FetchOutcome {
  releases: ChangelogRelease[];
  /** Set when the network failed and the result came from cache, or is empty. */
  warning?: string;
}

interface RawRelease {
  tag_name?: unknown;
  name?: unknown;
  html_url?: unknown;
  published_at?: unknown;
  created_at?: unknown;
  prerelease?: unknown;
  draft?: unknown;
  body?: unknown;
}

function normalizeRelease(raw: RawRelease): ChangelogRelease | undefined {
  if (typeof raw.tag_name !== "string" || raw.tag_name === "") return undefined;
  // Draft releases are never public and must never reach the site (CHANGELOG §4).
  if (raw.draft === true) return undefined;
  const published = typeof raw.published_at === "string" ? raw.published_at : undefined;
  const created = typeof raw.created_at === "string" ? raw.created_at : undefined;

  return {
    tag: raw.tag_name,
    name: typeof raw.name === "string" && raw.name !== "" ? raw.name : undefined,
    url: typeof raw.html_url === "string" ? raw.html_url : "",
    publishedAt: published ?? created,
    prerelease: raw.prerelease === true,
    body: typeof raw.body === "string" ? raw.body : "",
  };
}

function describeResponse(response: Response): string {
  if (
    (response.status === 403 || response.status === 429) &&
    response.headers.get("x-ratelimit-remaining") === "0"
  ) {
    return `GitHub API rate limit exceeded (HTTP ${response.status}). Set GITHUB_TOKEN (or \`changelog.token\`) to raise the limit.`;
  }
  return `GitHub API returned HTTP ${response.status} ${response.statusText}`.trim();
}

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Fetches release lists for the whole build pass (CHANGELOG §11): results are
 * memoized in memory so pages sharing a repository — including the same page
 * across locales — cause a single request, and persisted under
 * `.makit/cache/changelog/` so repeat builds inside the TTL stay offline.
 *
 * Network failures never fail the build: the stale cache is used when there is
 * one, an empty list otherwise, always with a `changelog-fetch-failed` warning
 * for the caller to attribute to a page (CHANGELOG §12).
 */
export class ChangelogFetcher {
  private readonly memo = new Map<string, CacheEntry>();

  constructor(
    private readonly config: ResolvedChangelogConfig,
    private readonly cacheDir: string,
    private readonly fetchImpl: FetchLike = (url, init) => fetch(url, init),
  ) {}

  static create(config: ResolvedConfig, fetchImpl?: FetchLike): ChangelogFetcher {
    return new ChangelogFetcher(
      config.changelog,
      join(config.root, ".makit", "cache", "changelog"),
      fetchImpl,
    );
  }

  async fetch(repository: string, want: number): Promise<FetchOutcome> {
    const memoized = this.memo.get(repository);
    if (memoized && this.satisfies(memoized, want)) {
      return { releases: memoized.releases };
    }

    const cached = memoized ?? (await this.readCache(repository));

    if (this.config.offline) {
      if (cached) return { releases: cached.releases };
      return {
        releases: [],
        warning: `\`changelog\` is offline (\`changelog.offline\` or MAKIT_OFFLINE) and no cached releases exist for "${repository}"`,
      };
    }

    const fresh =
      cached !== undefined &&
      Date.now() - cached.fetchedAt < this.config.cacheTtl * 1000 &&
      this.satisfies(cached, want);
    if (cached && fresh) {
      this.memo.set(repository, cached);
      return { releases: cached.releases };
    }

    try {
      const entry = await this.request(repository, want, cached);
      this.memo.set(repository, entry);
      await this.writeCache(repository, entry);
      return { releases: entry.releases };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      if (cached) {
        // Keep serving the stale copy; a transient outage must not blank the page.
        this.memo.set(repository, cached);
        return {
          releases: cached.releases,
          warning: `Could not refresh releases for "${repository}" (${reason}) — using cached data from ${new Date(cached.fetchedAt).toISOString()}`,
        };
      }
      return {
        releases: [],
        warning: `Could not fetch releases for "${repository}" (${reason}) and no cached data is available`,
      };
    }
  }

  private satisfies(entry: CacheEntry, want: number): boolean {
    return entry.complete || entry.count >= want;
  }

  private async request(
    repository: string,
    want: number,
    cached: CacheEntry | undefined,
  ): Promise<CacheEntry> {
    const collected: ChangelogRelease[] = [];
    let etag: string | undefined;
    let complete = false;

    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const url = `${this.config.apiBaseUrl}/repos/${repository}/releases?per_page=${PER_PAGE}&page=${page}`;
      const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "makit",
      };
      if (this.config.token) headers.Authorization = `Bearer ${this.config.token}`;
      // Revalidate only when the cached copy would already be big enough:
      // a 304 must not leave us short of the requested count.
      if (page === 1 && cached?.etag && this.satisfies(cached, want)) {
        headers["If-None-Match"] = cached.etag;
      }

      const response = await this.fetchImpl(url, { headers });

      if (response.status === 304 && cached) {
        return { ...cached, fetchedAt: Date.now() };
      }
      if (!response.ok) {
        throw new Error(describeResponse(response));
      }
      if (page === 1) etag = response.headers.get("etag") ?? undefined;

      const payload: unknown = await response.json();
      if (!Array.isArray(payload)) {
        throw new Error("GitHub API returned an unexpected payload");
      }

      for (const raw of payload as RawRelease[]) {
        const release = normalizeRelease(raw);
        if (release) collected.push(release);
      }

      if (payload.length < PER_PAGE) {
        complete = true;
        break;
      }
      // Drafts are dropped above, so compare against the raw page count.
      if (collected.length >= want) break;
    }

    // Stored in API order; `filterReleases` orders by version at render time,
    // so a cache written by an earlier version still renders correctly.
    return { fetchedAt: Date.now(), etag, count: collected.length, complete, releases: collected };
  }

  private cachePath(repository: string): string {
    const key = createHash("sha256")
      .update(`${this.config.apiBaseUrl}\n${repository}`)
      .digest("hex");
    return join(this.cacheDir, `${key}.json`);
  }

  /** Caching is a pure optimization: an unreadable entry is simply a miss. */
  private async readCache(repository: string): Promise<CacheEntry | undefined> {
    const path = this.cachePath(repository);
    if (!existsSync(path)) return undefined;
    try {
      const entry = JSON.parse(await readFile(path, "utf-8")) as CacheEntry;
      if (!Array.isArray(entry.releases) || typeof entry.fetchedAt !== "number") return undefined;
      return entry;
    } catch {
      return undefined;
    }
  }

  private async writeCache(repository: string, entry: CacheEntry): Promise<void> {
    try {
      await mkdir(this.cacheDir, { recursive: true });
      await writeFile(this.cachePath(repository), JSON.stringify(entry), "utf-8");
    } catch {
      // Ignore: an unwritable cache must not fail the build.
    }
  }
}

// #endregion

export interface ApplyChangelogResult {
  content: string;
  diagnostics: Diagnostic[];
}

export interface ApplyChangelogContext {
  /** Absolute path of the Markdown file, for diagnostics. */
  sourcePath: string;
  /** BCP-47 locale of the page, used to format dates and pick labels. */
  locale: string;
  prereleaseLabel: string;
  emptyLabel: string;
}

/**
 * Fetches, filters, renders, and merges a page's changelog (CHANGELOG §2, §5,
 * §6). Runs before Markdown processing so the generated release notes go
 * through the same pipeline as hand-written content.
 */
export async function applyChangelog(
  content: string,
  changelog: PageChangelog,
  config: ResolvedConfig,
  fetcher: ChangelogFetcher,
  context: ApplyChangelogContext,
): Promise<ApplyChangelogResult> {
  // `enabled: false` leaves the body — marker included — completely untouched.
  if (!config.changelog.enabled) return { content, diagnostics: [] };

  const options = resolvePageChangelog(changelog, config.changelog, context.sourcePath);
  const diagnostics: Diagnostic[] = [];

  const outcome = await fetcher.fetch(options.repository, options.limit);
  if (outcome.warning) {
    diagnostics.push({
      code: "changelog-fetch-failed",
      message: outcome.warning,
      sourcePath: context.sourcePath,
    });
  }

  const releases = filterReleases(outcome.releases, options);
  if (releases.length === 0 && !outcome.warning) {
    diagnostics.push({
      code: "changelog-empty",
      message: `No releases in "${options.repository}" matched this page's \`changelog\` filters`,
      sourcePath: context.sourcePath,
    });
  }

  const markdown = renderChangelogMarkdown(releases, {
    headingLevel: options.headingLevel,
    prereleaseLabel: context.prereleaseLabel,
    emptyLabel: context.emptyLabel,
    dateStyle: config.changelog.dateStyle,
    locale: context.locale,
  });

  return { content: mergeChangelog(content, markdown), diagnostics };
}
