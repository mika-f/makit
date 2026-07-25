import type { ThemeVariablesProps } from "@natsuneko-laboratory/makit-runtime";

interface AccentValue {
  light: string;
  dark: string;
}

/**
 * The accent drives the logo mark, the active navigation pill, and the home
 * page's gradient, so each name carries a pair tuned for contrast against
 * this theme's two backgrounds rather than a single hue.
 */
const ACCENTS: Record<string, AccentValue> = {
  indigo: { light: "#4f46e5", dark: "#818cf8" },
  violet: { light: "#7c3aed", dark: "#a78bfa" },
  blue: { light: "#2563eb", dark: "#60a5fa" },
  sky: { light: "#0284c7", dark: "#38bdf8" },
  teal: { light: "#0d9488", dark: "#2dd4bf" },
  emerald: { light: "#059669", dark: "#34d399" },
  rose: { light: "#e11d48", dark: "#fb7185" },
  amber: { light: "#d97706", dark: "#fbbf24" },
};

function resolveAccent(accentColor: string | undefined): AccentValue {
  if (!accentColor) return ACCENTS.indigo!;
  const named = ACCENTS[accentColor.toLowerCase()];
  if (named) return named;
  return { light: accentColor, dark: accentColor };
}

const RADIUS: Record<string, string> = {
  none: "0px",
  small: "0.375rem",
  medium: "0.625rem",
  large: "0.875rem",
};

/**
 * Replaces the standard palette (THEME §13.3). The grays are slightly
 * blue-tinted (slate rather than zinc) so they sit under a saturated accent
 * without looking muddy, and `--makit-color-surface` is deliberately lifted
 * off the background in both schemes — this theme leans on cards.
 */
const LIGHT = [
  "--makit-color-background:#ffffff",
  "--makit-color-surface:#ffffff",
  "--makit-color-foreground:#0f172a",
  "--makit-color-subtle:#64748b",
  "--makit-color-muted:#f1f5f9",
  "--makit-color-border:#e2e8f0",
  "--makit-color-border-strong:#cbd5e1",
].join(";");

const DARK = [
  "--makit-color-background:#0b1120",
  "--makit-color-surface:#131c2f",
  "--makit-color-foreground:#e8edf7",
  "--makit-color-subtle:#94a3b8",
  "--makit-color-muted:#1c273d",
  "--makit-color-border:#22304a",
  "--makit-color-border-strong:#38486a",
].join(";");

export function ThemeVariables({ theme }: ThemeVariablesProps) {
  const accent = resolveAccent(theme.accentColor);
  const radius = RADIUS[theme.radius] ?? RADIUS.large!;

  const css = `:root{--makit-color-accent:${accent.light};${LIGHT};--makit-radius:${radius};--makit-product-shadow:0 1px 2px rgb(15 23 42 / 0.04),0 8px 24px -12px rgb(15 23 42 / 0.12);}
:root[data-theme="dark"]{--makit-color-accent:${accent.dark};${DARK};--makit-product-shadow:0 1px 2px rgb(0 0 0 / 0.3),0 8px 24px -12px rgb(0 0 0 / 0.6);}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]):not([data-theme="dark"]){--makit-color-accent:${accent.dark};${DARK};--makit-product-shadow:0 1px 2px rgb(0 0 0 / 0.3),0 8px 24px -12px rgb(0 0 0 / 0.6);}}
.makit-header-logo-dark{display:none}:root[data-theme="dark"] .makit-header-logo-light{display:none}:root[data-theme="dark"] .makit-header-logo-dark{display:block}@media (prefers-color-scheme: dark){:root:not([data-theme="light"]):not([data-theme="dark"]) .makit-header-logo-light{display:none}:root:not([data-theme="light"]):not([data-theme="dark"]) .makit-header-logo-dark{display:block}}`;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
