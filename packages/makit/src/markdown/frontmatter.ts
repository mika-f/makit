import matter from "gray-matter";
import { z } from "zod";
import type { Diagnostic } from "../core/validation.js";
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
  /** Unsupported fields are dropped rather than failing the build (spec §31.1). */
  diagnostics: Diagnostic[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type FrontMatterShape = typeof frontMatterSchema.shape;

/**
 * Drops fields deeper than one level — nested fields need `.meta.ts` — and
 * fields that don't match the flat schema, reporting each as a warning
 * instead of failing the whole page. Unrecognized keys are stripped
 * silently, as before, so editor/CMS metadata can coexist harmlessly.
 */
function collectFlatData(
  data: Record<string, unknown>,
  sourcePath: string,
  diagnostics: Diagnostic[],
): Partial<PageMetadata> {
  const shape = frontMatterSchema.shape as FrontMatterShape;
  const metadata: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const values = Array.isArray(value) ? value : [value];
    if (values.some(isPlainObject)) {
      diagnostics.push({
        code: "front-matter-too-deep",
        sourcePath,
        message:
          `front matter field "${key}" is nested. Markdown front matter only supports flat ` +
          '(scalar) fields; move structured metadata into a sibling "{filename}.meta.ts" file ' +
          "(definePageMetadata) instead. The field was ignored.",
      });
      continue;
    }

    const fieldSchema = shape[key as keyof FrontMatterShape];
    if (!fieldSchema) continue; // unknown keys are stripped silently

    const result = fieldSchema.safeParse(value);
    if (!result.success) {
      diagnostics.push({
        code: "front-matter-invalid-value",
        sourcePath,
        message:
          `front matter field "${key}" is invalid — ${result.error.issues
            .map((issue) => issue.message)
            .join(", ")}. The field was ignored.`,
      });
      continue;
    }

    metadata[key] = result.data;
  }

  return metadata as Partial<PageMetadata>;
}

/**
 * Extracts a Markdown page's own YAML front matter, if any, as a flat
 * {@link PageMetadata} subset, and returns the body with the block removed.
 * Fields that are nested or fail validation are dropped and reported as
 * diagnostics rather than aborting the build.
 */
export function parseFrontMatter(raw: string, sourcePath: string): ParsedFrontMatter {
  const parsed = matter(raw);
  if (Object.keys(parsed.data).length === 0) {
    return { content: parsed.content, diagnostics: [] };
  }

  const diagnostics: Diagnostic[] = [];
  const metadata = collectFlatData(parsed.data, sourcePath, diagnostics);

  return { metadata, content: parsed.content, diagnostics };
}
