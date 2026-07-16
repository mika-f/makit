import matter from "gray-matter";
import { formatZodError, MakitError } from "../core/errors.js";
import type { PageFrontMatter } from "../types/frontmatter.js";
import { frontMatterSchema } from "./frontmatter-schema.js";

export interface ParsedFrontMatter {
  data: PageFrontMatter;
  /** Markdown body with the front matter block removed. */
  content: string;
}

/**
 * Extracts and validates YAML front matter (spec §14). Both a malformed
 * YAML block and a value of the wrong type are treated as the same class
 * of build-stopping error.
 */
export function parseFrontMatter(raw: string, sourcePath: string): ParsedFrontMatter {
  let data: Record<string, unknown>;
  let content: string;
  try {
    const result = matter(raw);
    data = result.data;
    content = result.content;
  } catch (error) {
    throw new MakitError(
      "frontmatter-parse-failed",
      `Failed to parse front matter in ${sourcePath}`,
      {
        cause: error,
      },
    );
  }

  const parsed = frontMatterSchema.safeParse(data);
  if (!parsed.success) {
    throw new MakitError(
      "frontmatter-parse-failed",
      `Invalid front matter in ${sourcePath}:\n${formatZodError(parsed.error)}`,
      { cause: parsed.error },
    );
  }

  return { data: parsed.data, content };
}
