import { z } from "zod";

/**
 * Unknown keys are stripped rather than rejected — front matter is authored
 * by hand in many small files, and tools other than Makit may read the same
 * files (e.g. an editor's own metadata). Only the fields Makit understands
 * are validated.
 */
export const frontMatterSchema = z.object({
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
  navigation: z
    .object({
      title: z.string().optional(),
      group: z.string().optional(),
    })
    .optional(),
});

export type FrontMatterParsed = z.output<typeof frontMatterSchema>;
