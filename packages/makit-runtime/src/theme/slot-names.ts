/**
 * The closed set of theme slot names (THEME §5). Kept free of any React or
 * Next.js import so the Makit CLI can load it in plain Node to validate
 * `theme.components` and to discover convention-directory files (THEME §8).
 */

/** Slots that own a whole page's structure. Server Components only (THEME §11.1). */
export const THEME_PAGE_SLOT_NAMES = [
  "RootLayout",
  "DocsPage",
  "PortalHomePage",
  "RootPage",
  "NotFoundPage",
] as const;

/** Slots for the individual parts a page is composed of (THEME §5.2). */
export const THEME_PART_SLOT_NAMES = [
  "Header",
  "Footer",
  "Sidebar",
  "NavigationItems",
  "Breadcrumbs",
  "PageHeader",
  "PageContent",
  "PrevNextLinks",
  "TableOfContents",
  "PageActions",
  "SearchDialog",
  "CollectionSwitcher",
  "LocaleSwitcher",
  "ThemeToggle",
  "FallbackNotice",
  "ThemeVariables",
  "ThemeScript",
] as const;

export const THEME_SLOT_NAMES = [...THEME_PAGE_SLOT_NAMES, ...THEME_PART_SLOT_NAMES] as const;

export type ThemePageSlotName = (typeof THEME_PAGE_SLOT_NAMES)[number];
export type ThemePartSlotName = (typeof THEME_PART_SLOT_NAMES)[number];
export type ThemeSlotName = (typeof THEME_SLOT_NAMES)[number];

/**
 * Slots that accept `false` to disable rendering (THEME §7.4). Everything
 * else is structural — the page cannot be assembled without it — and
 * disabling it is rejected with `theme-slot-not-optional`.
 */
export const OPTIONAL_THEME_SLOT_NAMES = [
  "Footer",
  "Sidebar",
  "Breadcrumbs",
  "PageHeader",
  "PrevNextLinks",
  "TableOfContents",
  "PageActions",
  "SearchDialog",
  "CollectionSwitcher",
  "LocaleSwitcher",
  "ThemeToggle",
  "FallbackNotice",
  "ThemeScript",
] as const;

export type OptionalThemeSlotName = (typeof OPTIONAL_THEME_SLOT_NAMES)[number];

const SLOT_NAME_SET: ReadonlySet<string> = new Set(THEME_SLOT_NAMES);
const OPTIONAL_SLOT_NAME_SET: ReadonlySet<string> = new Set(OPTIONAL_THEME_SLOT_NAMES);

export function isThemeSlotName(value: string): value is ThemeSlotName {
  return SLOT_NAME_SET.has(value);
}

export function isOptionalThemeSlotName(value: string): value is OptionalThemeSlotName {
  return OPTIONAL_SLOT_NAME_SET.has(value);
}

/** `"TableOfContents"` -> `"table-of-contents"` (the convention-directory file name, THEME §8). */
export function themeSlotFileName(slot: ThemeSlotName): string {
  return slot.replace(/(?<!^)[A-Z]/g, (char) => `-${char}`).toLowerCase();
}

/** Convention-directory file base name -> slot name, for every slot. */
export const THEME_SLOT_NAME_BY_FILE_NAME: Readonly<Record<string, ThemeSlotName>> = Object.freeze(
  Object.fromEntries(THEME_SLOT_NAMES.map((slot) => [themeSlotFileName(slot), slot])),
);
