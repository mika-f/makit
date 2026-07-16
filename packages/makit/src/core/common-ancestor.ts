import { sep } from "node:path";

/** The deepest directory that contains every given absolute path. */
export function commonAncestorDir(paths: readonly string[]): string {
  if (paths.length === 0) return sep;

  const segmentsList = paths.map((path) => path.split(sep).filter(Boolean));
  let common = segmentsList[0]!;

  for (const segments of segmentsList.slice(1)) {
    let i = 0;
    while (i < common.length && i < segments.length && segments[i] === common[i]) i++;
    common = common.slice(0, i);
  }

  return common.length === 0 ? sep : `${sep}${common.join(sep)}`;
}
