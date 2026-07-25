import type { ThemeManifest } from "./types/theme.js";

/**
 * `Symbol.for` so the brand survives when the theme package resolves a
 * different copy of `makit` than the CLI loading its manifest.
 */
export const THEME_MANIFEST_BRAND = Symbol.for("makit.theme.manifest");

/**
 * Defines a theme package's manifest, the default export of its
 * `./makit-theme` entry point (THEME §9.3).
 *
 * ```ts
 * import { defineTheme } from "@natsuneko-laboratory/makit/theme";
 *
 * export default defineTheme({
 *   name: "@acme/makit-theme-corporate",
 *   styles: ["./dist/theme.css"],
 * });
 * ```
 */
export function defineTheme(manifest: ThemeManifest): ThemeManifest {
  // Non-enumerable so the brand never leaks into serialization or spreads.
  Object.defineProperty(manifest, THEME_MANIFEST_BRAND, {
    value: true,
    enumerable: false,
    configurable: true,
  });
  return manifest;
}

/** True when `value` came from `defineTheme`. */
export function isThemeManifest(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  return (value as Record<PropertyKey, unknown>)[THEME_MANIFEST_BRAND] === true;
}

export type {
  ThemeComponentRef,
  ThemeComponentRefObject,
  ThemeComponentsConfig,
  ThemeManifest,
  ThemeManifestDefaults,
} from "./types/theme.js";
export type {
  OptionalThemeSlotName,
  ThemePageSlotName,
  ThemePartSlotName,
  ThemeSlotName,
} from "@natsuneko-laboratory/makit-runtime/slot-names";
