import type { ThemeVariablesProps } from "@natsuneko-laboratory/makit-runtime";

interface AccentValue {
  light: string;
  dark: string;
}

const ACCENTS: Record<string, AccentValue> = {
  oxblood: { light: "#8c2f39", dark: "#e58b94" },
  rust: { light: "#a44724", dark: "#ed9a72" },
  forest: { light: "#3f684e", dark: "#8fc69f" },
  navy: { light: "#334e68", dark: "#91b5d0" },
  plum: { light: "#76506f", dark: "#cba4c2" },
  gold: { light: "#886b18", dark: "#d9bd62" },
};

const RADIUS: Record<string, string> = {
  none: "0px",
  small: "0.25rem",
  medium: "0.5rem",
  large: "0.75rem",
};

function resolveAccent(value: string | undefined): AccentValue {
  if (!value) return ACCENTS.oxblood!;
  return ACCENTS[value.toLowerCase()] ?? { light: value, dark: value };
}

const LIGHT = [
  "--makit-color-background:#f8f5ee",
  "--makit-color-surface:#fffdf8",
  "--makit-color-foreground:#28231f",
  "--makit-color-subtle:#70675f",
  "--makit-color-muted:#eee9df",
  "--makit-color-border:#d8d0c3",
  "--makit-color-border-strong:#a99e90",
].join(";");

const DARK = [
  "--makit-color-background:#191714",
  "--makit-color-surface:#211e1a",
  "--makit-color-foreground:#eee8dc",
  "--makit-color-subtle:#aaa094",
  "--makit-color-muted:#2d2924",
  "--makit-color-border:#403a33",
  "--makit-color-border-strong:#71675b",
].join(";");

export function ThemeVariables({ theme }: ThemeVariablesProps) {
  const accent = resolveAccent(theme.accentColor);
  const radius = RADIUS[theme.radius] ?? RADIUS.small!;
  const css = `:root{--makit-color-accent:${accent.light};${LIGHT};--makit-radius:${radius};--makit-editorial-rule:1px solid var(--makit-color-border);}
:root[data-theme="dark"]{--makit-color-accent:${accent.dark};${DARK};}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]):not([data-theme="dark"]){--makit-color-accent:${accent.dark};${DARK};}}
.makit-header-logo-dark{display:none}:root[data-theme="dark"] .makit-header-logo-light{display:none}:root[data-theme="dark"] .makit-header-logo-dark{display:block}@media (prefers-color-scheme:dark){:root:not([data-theme="light"]):not([data-theme="dark"]) .makit-header-logo-light{display:none}:root:not([data-theme="light"]):not([data-theme="dark"]) .makit-header-logo-dark{display:block}}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
