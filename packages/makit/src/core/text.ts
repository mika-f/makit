const HTML_ESCAPE_RE = /[&<>"']/g;
const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escapes text for safe inclusion in generated HTML (e.g. synthesized collection/portal pages). */
export function escapeHtml(input: string): string {
  return input.replace(HTML_ESCAPE_RE, (char) => HTML_ESCAPES[char]!);
}

/** Turns a title into a stable kebab-case key for `navigation.primary` matching (spec §30). */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

/** Turns a `kebab-case` or `snake_case` slug into a human-readable title. */
export function humanizeSlug(input: string): string {
  if (!input) return "";
  return input
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => (part[0]?.toUpperCase() ?? "") + part.slice(1))
    .join(" ");
}
