import { MakitError } from "./errors.js";

export interface ParsedRouteGroupSegment {
  /** Name with the wrapping parentheses removed, or the original name when it isn't a route group. */
  name: string;
  /** Whether `rawName` was a `(group)`-style route group. */
  isRouteGroup: boolean;
}

const ROUTE_GROUP_RE = /^\((.*)\)$/;

/**
 * Parses a Next.js-style route group directory name (ROUTE-GROUPS §2):
 * `"(marketing)"` -> `{ name: "marketing", isRouteGroup: true }`. A route
 * group never contributes a segment to the URL, but the directory still
 * exists on the filesystem and in the navigation tree under its unwrapped
 * name (ROUTE-GROUPS §3).
 */
export function parseRouteGroupSegment(
  rawName: string,
  sourcePath: string,
): ParsedRouteGroupSegment {
  const match = ROUTE_GROUP_RE.exec(rawName);
  if (!match) return { name: rawName, isRouteGroup: false };

  const [, inner] = match;
  if (!inner) {
    throw new MakitError(
      "empty-name-in-route-group",
      `"${rawName}" (${sourcePath}) is a route group but has no name inside the parentheses. ` +
        'Route groups must have a name, e.g. "(marketing)" (ROUTE-GROUPS §16).',
    );
  }

  return { name: inner, isRouteGroup: true };
}
