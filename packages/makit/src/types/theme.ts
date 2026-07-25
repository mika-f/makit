import type { ThemeSlotName } from "@natsuneko-laboratory/makit-runtime/slot-names";
import type { MakitColorScheme, MakitRadius } from "./config.js";

/**
 * A slot's implementation as named in `makit.config.ts` (THEME §7.4):
 * a module specifier (default export), an explicit `{ from, export }` pair,
 * or `false` to disable the slot.
 *
 * Components cannot be passed by value: the config is evaluated by the CLI,
 * while components are loaded by the generated Next.js app, and the two do
 * not share a module graph (THEME §3.4).
 */
export type ThemeComponentRef = string | ThemeComponentRefObject | false;

export interface ThemeComponentRefObject {
  /** Module specifier: a package name, or a path relative to the project root. */
  from: string;
  /** Named export to use. Defaults to the module's default export. */
  export?: string;
}

export type ThemeComponentsConfig = {
  [K in ThemeSlotName]?: ThemeComponentRef;
};

/** Token defaults a theme recommends; the user's own `theme` config wins (THEME §9.4). */
export interface ThemeManifestDefaults {
  colorScheme?: MakitColorScheme;
  accentColor?: string;
  radius?: MakitRadius;
  codeTheme?: string | { light: string; dark: string };
}

/**
 * What a theme package declares to the build (THEME §9.3). Loaded by the CLI
 * in plain Node, so it must not import React and must be synchronously
 * evaluable and serializable (spec §20).
 */
export interface ThemeManifest {
  /** Display name used in diagnostics. */
  name: string;
  /**
   * CSS the theme ships, as paths relative to the theme root. Imported into
   * the generated stylesheet ahead of the user's own `styles` (THEME §13.2).
   */
  styles?: string[];
  /**
   * Globs (relative to the theme root) Tailwind should scan for class names.
   * Defaults to the theme root's built JavaScript (THEME §13.1).
   */
  tailwindSources?: string[];
  defaults?: ThemeManifestDefaults;
}
