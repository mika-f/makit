import type { StaticPageLayout } from "../metadata/types.js";
import type { GeneratedMetadata } from "./page.js";

/** One static page in one locale, as written to `.makit/generated/static-pages/` (STATIC-PAGES §12.2). */
export interface GeneratedStaticPage {
  /** Static Page ID (STATIC-PAGES §2). */
  id: string;
  route: string;
  /** URL path segments below the locale prefix. */
  segments: string[];
  /** URL-facing locale this page is served under. */
  locale: string;
  /** Absolute path of the source file actually used for this locale. */
  sourcePath: string;
  /** Absolute path of the `.meta.ts`, when one exists. */
  metadataPath?: string;
  kind: "component" | "html";
  /** Key into `.makit/app/static-pages.js` (kind: "component" only). */
  componentKey?: string;
  /** Processed HTML Fragment (kind: "html" only). */
  html?: string;
  title: string;
  description?: string;
  layout: StaticPageLayout;
  search: boolean;
  draft: boolean;
  metadata: GeneratedMetadata;
}
