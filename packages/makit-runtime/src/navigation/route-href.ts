/**
 * The site's `basePath`, inlined at build time through the generated
 * `next.config.mjs` `env` (spec §28). Empty when the site is served at `/`.
 */
export const BASE_PATH: string = process.env.MAKIT_BASE_PATH ?? "";

/**
 * Converts a public href into the form `next/link` expects. Generated routes
 * (page routes, navigation, breadcrumbs, locale links, Pagefind results, …)
 * already carry `basePath`, while `next/link` prepends it again — so a
 * leading `basePath` segment is stripped here. Hrefs without it (user-written
 * `"/guide/"`, anchors, external URLs) are returned unchanged, so both forms
 * of an internal href end up at the same URL.
 */
export function toLinkHref(href: string, basePath: string = BASE_PATH): string {
  if (!basePath || !href.startsWith(basePath)) return href;
  const rest = href.slice(basePath.length);
  if (rest === "") return "/";
  // Only strip on a segment boundary: "/docs-old/" is not under "/docs".
  if (rest.startsWith("/")) return rest;
  if (rest.startsWith("?") || rest.startsWith("#")) return `/${rest}`;
  return href;
}
