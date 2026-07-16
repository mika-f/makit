export interface PageFrontMatter {
  id?: string;
  title?: string;
  description?: string;
  slug?: string | string[];
  order?: number;
  draft?: boolean;
  hidden?: boolean;
  sidebar?: boolean;
  tableOfContents?: boolean;
  layout?: string;
  canonical?: string;
  image?: string;
  noindex?: boolean;
  nofollow?: boolean;
  navigation?: {
    title?: string;
    group?: string;
  };
}
