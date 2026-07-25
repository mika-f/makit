import type { ThemeVariablesProps } from "@natsuneko-laboratory/makit-runtime";

interface AccentValue {
  light: string;
  dark: string;
}

/**
 * Phosphor-tinted accents, named after the classic terminal colors. Anything
 * that is not a known name is treated as a CSS color and used verbatim, which
 * is how the standard theme behaves too.
 */
const ACCENTS: Record<string, AccentValue> = {
  green: { light: "#15803d", dark: "#4ade80" },
  amber: { light: "#b45309", dark: "#fbbf24" },
  cyan: { light: "#0e7490", dark: "#22d3ee" },
  magenta: { light: "#a21caf", dark: "#e879f9" },
  blue: { light: "#1d4ed8", dark: "#60a5fa" },
  red: { light: "#b91c1c", dark: "#f87171" },
  white: { light: "#27272a", dark: "#e4e4e7" },
};

function resolveAccent(accentColor: string | undefined): AccentValue {
  if (!accentColor) return ACCENTS.green!;
  const named = ACCENTS[accentColor.toLowerCase()];
  if (named) return named;
  return { light: accentColor, dark: accentColor };
}

/**
 * Replaces the standard palette (THEME §13.3). Every `--makit-color-*` the
 * base stylesheet reads is redefined here, because `.makit-prose` and the
 * Shiki code-block styles depend on them.
 *
 * `--makit-radius` is pinned to 0: square corners are the whole point of this
 * theme, and `styles/theme.css` squares off the standard components too.
 */
const LIGHT = [
  "--makit-color-background:#f8f8f6",
  "--makit-color-surface:#ffffff",
  "--makit-color-foreground:#171717",
  "--makit-color-subtle:#6b6b66",
  "--makit-color-muted:#edede9",
  "--makit-color-border:#dcdcd6",
  "--makit-color-border-strong:#b6b6ae",
].join(";");

const DARK = [
  "--makit-color-background:#0a0a0a",
  "--makit-color-surface:#121212",
  "--makit-color-foreground:#e4e4e4",
  "--makit-color-subtle:#8f8f8a",
  "--makit-color-muted:#171717",
  "--makit-color-border:#272727",
  "--makit-color-border-strong:#3f3f3f",
].join(";");

export function ThemeVariables({ theme }: ThemeVariablesProps) {
  const accent = resolveAccent(theme.accentColor);

  const css = `:root{--makit-color-accent:${accent.light};${LIGHT};--makit-radius:0px;}
:root[data-theme="dark"]{--makit-color-accent:${accent.dark};${DARK};}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]):not([data-theme="dark"]){--makit-color-accent:${accent.dark};${DARK};}}
.makit-header-logo-dark{display:none}:root[data-theme="dark"] .makit-header-logo-light{display:none}:root[data-theme="dark"] .makit-header-logo-dark{display:block}@media (prefers-color-scheme: dark){:root:not([data-theme="light"]):not([data-theme="dark"]) .makit-header-logo-light{display:none}:root:not([data-theme="light"]):not([data-theme="dark"]) .makit-header-logo-dark{display:block}}`;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
