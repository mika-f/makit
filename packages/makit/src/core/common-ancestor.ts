import * as nodePath from "node:path";

type PathModule = Pick<typeof nodePath, "parse" | "sep">;

/**
 * The deepest directory that contains every given absolute path.
 *
 * Windows paths are rooted at a drive (e.g. `G:\`), not at `sep` like POSIX
 * paths are — so the root has to be derived from the input rather than
 * assumed to be a bare leading separator, and segments are only compared
 * once every path's own root has been stripped off. Paths rooted on
 * different drives share no real ancestor; that case collapses to just the
 * first path's root.
 *
 * `pathImpl` defaults to `node:path` (host platform semantics) and only
 * exists so tests can exercise `path.win32` behavior from any host.
 */
export function commonAncestorDir(
  paths: readonly string[],
  pathImpl: PathModule = nodePath,
): string {
  const { parse, sep } = pathImpl;
  if (paths.length === 0) return sep;

  const root = parse(paths[0]!).root;
  const segmentsList = paths.map((path) => {
    const parsed = parse(path);
    if (parsed.root !== root) return [];
    return path.slice(parsed.root.length).split(sep).filter(Boolean);
  });

  let common = segmentsList[0]!;
  for (const segments of segmentsList.slice(1)) {
    let i = 0;
    while (i < common.length && i < segments.length && segments[i] === common[i]) i++;
    common = common.slice(0, i);
  }

  return root + common.join(sep);
}
