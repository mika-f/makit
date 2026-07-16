import type { ThemeData } from "../data/types.js";
import { resolveAccentColor, resolveRadius } from "./accent-palette.js";

/** Renders the CSS Variables the standard theme reads (spec §21.4). */
export function ThemeVariables({ theme }: { theme: ThemeData }) {
  const accent = resolveAccentColor(theme.accentColor);
  const radius = resolveRadius(theme.radius);

  const css = `:root{--makit-color-accent:${accent.light};--makit-color-background:#ffffff;--makit-color-foreground:#111827;--makit-color-muted:#f3f4f6;--makit-color-border:#e5e7eb;--makit-radius:${radius};}
:root[data-theme="dark"]{--makit-color-accent:${accent.dark};--makit-color-background:#0b0f19;--makit-color-foreground:#e5e7eb;--makit-color-muted:#1f2937;--makit-color-border:#293241;}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]):not([data-theme="dark"]){--makit-color-accent:${accent.dark};--makit-color-background:#0b0f19;--makit-color-foreground:#e5e7eb;--makit-color-muted:#1f2937;--makit-color-border:#293241;}}`;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
