import type { ThemeData } from "../data/types.js";
import { resolveAccentColor, resolveRadius } from "./accent-palette.js";

/** Renders the CSS Variables the standard theme reads (spec §21.4). */
export function ThemeVariables({ theme }: { theme: ThemeData }) {
  const accent = resolveAccentColor(theme.accentColor);
  const radius = resolveRadius(theme.radius);

  const css = `:root{--makit-color-accent:${accent.light};--makit-color-background:#ffffff;--makit-color-surface:#ffffff;--makit-color-foreground:#18181b;--makit-color-subtle:#71717a;--makit-color-muted:#f4f4f5;--makit-color-border:#e4e4e7;--makit-color-border-strong:#d4d4d8;--makit-radius:${radius};}
:root[data-theme="dark"]{--makit-color-accent:${accent.dark};--makit-color-background:#09090b;--makit-color-surface:#111113;--makit-color-foreground:#f4f4f5;--makit-color-subtle:#a1a1aa;--makit-color-muted:#18181b;--makit-color-border:#27272a;--makit-color-border-strong:#3f3f46;}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]):not([data-theme="dark"]){--makit-color-accent:${accent.dark};--makit-color-background:#09090b;--makit-color-surface:#111113;--makit-color-foreground:#f4f4f5;--makit-color-subtle:#a1a1aa;--makit-color-muted:#18181b;--makit-color-border:#27272a;--makit-color-border-strong:#3f3f46;}}`;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
