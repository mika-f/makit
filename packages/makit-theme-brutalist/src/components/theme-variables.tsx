import type { ThemeVariablesProps } from "@natsuneko-laboratory/makit-runtime";

interface AccentValue {
  light: string;
  dark: string;
  highlight: string;
}

const ACCENTS: Record<string, AccentValue> = {
  signal: { light: "#735600", dark: "#ffe45c", highlight: "#ffe500" },
  orange: { light: "#9a3412", dark: "#fdba74", highlight: "#ff6b00" },
  lime: { light: "#3f6212", dark: "#bef264", highlight: "#b6f000" },
  cyan: { light: "#0e6471", dark: "#67e8f9", highlight: "#22d3ee" },
  pink: { light: "#9d174d", dark: "#f9a8d4", highlight: "#ff4fa3" },
  violet: { light: "#6d28d9", dark: "#c4b5fd", highlight: "#9d6cff" },
};

function resolveAccent(value: string | undefined): AccentValue {
  if (!value) return ACCENTS.signal!;
  return (
    ACCENTS[value.toLowerCase()] ?? {
      light: value,
      dark: value,
      highlight: value,
    }
  );
}

const LIGHT = [
  "--makit-color-background:#f7f5ed",
  "--makit-color-surface:#fffef8",
  "--makit-color-foreground:#111111",
  "--makit-color-subtle:#565656",
  "--makit-color-muted:#e8e5da",
  "--makit-color-border:#b8b4a8",
  "--makit-color-border-strong:#111111",
].join(";");

const DARK = [
  "--makit-color-background:#111111",
  "--makit-color-surface:#1b1b1b",
  "--makit-color-foreground:#f7f5ed",
  "--makit-color-subtle:#b9b6ad",
  "--makit-color-muted:#292929",
  "--makit-color-border:#4a4a46",
  "--makit-color-border-strong:#f7f5ed",
].join(";");

export function ThemeVariables({ theme }: ThemeVariablesProps) {
  const accent = resolveAccent(theme.accentColor);
  const css = `:root{--makit-color-accent:${accent.light};--makit-brutalist-highlight:${accent.highlight};${LIGHT};--makit-radius:0px;--makit-brutalist-shadow:4px 4px 0 #111;}
:root[data-theme="dark"]{--makit-color-accent:${accent.dark};--makit-brutalist-highlight:${accent.highlight};${DARK};--makit-brutalist-shadow:4px 4px 0 ${accent.highlight};}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]):not([data-theme="dark"]){--makit-color-accent:${accent.dark};--makit-brutalist-highlight:${accent.highlight};${DARK};--makit-brutalist-shadow:4px 4px 0 ${accent.highlight};}}
.makit-header-logo-dark{display:none}:root[data-theme="dark"] .makit-header-logo-light{display:none}:root[data-theme="dark"] .makit-header-logo-dark{display:block}@media (prefers-color-scheme:dark){:root:not([data-theme="light"]):not([data-theme="dark"]) .makit-header-logo-light{display:none}:root:not([data-theme="light"]):not([data-theme="dark"]) .makit-header-logo-dark{display:block}}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
