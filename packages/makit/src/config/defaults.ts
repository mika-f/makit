export const CONFIG_FILE_CANDIDATES = [
  "makit.config.ts",
  "makit.config.mts",
  "makit.config.js",
  "makit.config.mjs",
] as const;

export const DEFAULT_LANG = "en";
export const DEFAULT_SOURCE_DIR = "docs";
export const DEFAULT_PUBLIC_DIR = "public";
export const DEFAULT_OUT_DIR = "dist";
export const DEFAULT_BASE_PATH = "";
/** Convention directory scanned for theme slot files (THEME §8). */
export const DEFAULT_THEME_DIR = "theme";
/** Extensions a theme slot file may use, in resolution order (THEME §8). */
export const THEME_SLOT_EXTENSIONS = [".tsx", ".jsx", ".ts", ".js"] as const;

export const DEFAULT_SHIKI_THEME_LIGHT = "github-light";
export const DEFAULT_SHIKI_THEME_DARK = "github-dark";

export const DEFAULT_DEV_PORT = 3000;
export const DEFAULT_DEV_HOST = "localhost";

export const DEFAULT_FALLBACK_NOTICE =
  "This page has not been translated yet. Showing the default language version.";
export const DEFAULT_HOME_LABEL = "Home";

/** Changelog generation from GitHub Releases (CHANGELOG §4, §13). */
export const DEFAULT_GITHUB_API_BASE_URL = "https://api.github.com";
export const DEFAULT_CHANGELOG_CACHE_TTL = 3600;
export const DEFAULT_CHANGELOG_LIMIT = 30;
export const DEFAULT_CHANGELOG_HEADING_LEVEL = 2;
export const DEFAULT_CHANGELOG_PRERELEASE_LABEL = "Pre-release";
export const DEFAULT_CHANGELOG_EMPTY_LABEL = "No releases yet.";
/** Marker line replaced by the generated changelog, if present (CHANGELOG §6). */
export const CHANGELOG_MARKER = "<!-- makit:changelog -->";
