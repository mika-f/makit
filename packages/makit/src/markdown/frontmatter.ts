import matter from "gray-matter";
import { z } from "zod";
import { MakitError } from "../core/errors.js";
import type { PageMetadata } from "../metadata/types.js";

/**
 * The flat (one-level) subset of {@link PageMetadata} that a Markdown page's
 * own front matter may declare. This is a lightweight alternative to
 * `{page}.meta.ts` for pages that only need scalar overrides; nested fields
 * (`navigation`, `taxonomy`) require `.meta.ts`. Unknown keys are stripped
 * rather than rejected, so editor/CMS metadata can coexist harmlessly.
 */
const frontMatterSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  slug: z.union([z.string(), z.array(z.string())]).optional(),
  order: z.number().optional(),
  draft: z.boolean().optional(),
  hidden: z.boolean().optional(),
  sidebar: z.boolean().optional(),
  tableOfContents: z.boolean().optional(),
  layout: z.string().optional(),
  canonical: z.string().optional(),
  image: z.string().optional(),
  noindex: z.boolean().optional(),
  nofollow: z.boolean().optional(),
});

export interface ParsedFrontMatter {
  /** `undefined` when the file has no front matter block, or an empty one. */
  metadata?: PageMetadata;
  /** Markdown body with the front matter block removed. */
  content: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Rejects front matter deeper than one level — nested fields need `.meta.ts`. */
function assertFlat(data: Record<string, unknown>, sourcePath: string): void {
  for (const [key, value] of Object.entries(data)) {
    const values = Array.isArray(value) ? value : [value];
    if (values.some(isPlainObject)) {
      throw new MakitError(
        "front-matter-too-deep",
        `${sourcePath}: front matter field "${key}" is nested. Markdown front matter only ` +
          'supports flat (scalar) fields; move structured metadata into a sibling "{filename}.meta.ts" ' +
          "file (definePageMetadata) instead.",
      );
    }
  }
}

/**
 * Extracts a Markdown page's own YAML front matter, if any, as a flat
 * {@link PageMetadata} subset, and returns the body with the block removed.
 */
export function parseFrontMatter(raw: string, sourcePath: string): ParsedFrontMatter {
  const parsed = matter(raw);
  if (Object.keys(parsed.data).length === 0) {
    return { content: parsed.content };
  }

  assertFlat(parsed.data, sourcePath);

  const result = frontMatterSchema.safeParse(parsed.data);
  if (!result.success) {
    throw new MakitError(
      "front-matter-parse-failed",
      `${sourcePath}: invalid front matter — ${result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ")}`,
    );
  }

  return { metadata: result.data, content: parsed.content };
}
