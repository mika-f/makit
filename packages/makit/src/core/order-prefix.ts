import { MakitError } from "./errors.js";

export interface ParsedOrderedSegment {
  /** Name with the numeric prefix removed, or the original name when there is no prefix. */
  name: string;
  /** The numeric prefix, when present. */
  order?: number;
}

const ORDER_PREFIX_RE = /^([0-9]+)-(.*)$/;

/**
 * Parses a numeric filename/directory ordering prefix (spec §2):
 * `"01-installation"` -> `{ name: "installation", order: 1 }`. Negative and
 * decimal-looking names (`"-1-page"`, `"1.5-page"`) never match this regex
 * and are returned as ordinary names (spec §17 — MVP only supports
 * non-negative integers).
 */
export function parseOrderedSegment(rawName: string, sourcePath: string): ParsedOrderedSegment {
  const match = ORDER_PREFIX_RE.exec(rawName);
  if (!match) return { name: rawName };

  const [, digits, rest] = match;
  if (!rest) {
    throw new MakitError(
      "empty-name-after-order-prefix",
      `"${rawName}" (${sourcePath}) has a numeric prefix but no name after it. ` +
        "Ordered files and directories must have a name after the numeric prefix (spec §16).",
    );
  }

  const order = Number(digits);
  if (!Number.isSafeInteger(order)) {
    throw new MakitError(
      "order-prefix-out-of-range",
      `"${rawName}" (${sourcePath}) has a numeric prefix that exceeds the safe integer range (spec §22).`,
    );
  }

  return { name: rest, order };
}
