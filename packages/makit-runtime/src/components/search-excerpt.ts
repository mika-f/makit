/**
 * Pagefind escapes only `<` and `>` in excerpts, so reverse exactly that in a
 * single pass; any other `&…;` text is literal page content.
 */
export function decodePagefindExcerpt(excerpt: string): string {
  return excerpt.replace(/&(lt|gt);/g, (_, name: string) => (name === "lt" ? "<" : ">"));
}
