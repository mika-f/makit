import type { ComponentProps, ReactNode } from "react";
import type { SiteData } from "../data/types.js";
import type { ThemeComponents } from "../theme/components.js";

export interface RootLayoutProps {
  site: SiteData;
  /** Attributes the generated app requires on `<html>` (`lang`, `data-theme`, ...). */
  htmlProps: ComponentProps<"html">;
  /** Attributes the generated app requires on `<body>` (dev-refresh marker, ...). */
  bodyProps: ComponentProps<"body">;
  /**
   * Makit-owned nodes that must be rendered first inside `<body>`: the theme
   * CSS variables, the pre-hydration color-scheme script, and (in production)
   * analytics tags. A replacement must render this (THEME §10.3).
   */
  bodyStart: ReactNode;
  /** The resolved slot map (THEME §6). Unused by the standard implementation. */
  components: ThemeComponents;
  children: ReactNode;
}

/**
 * The document shell (THEME §5.1). Split out of the generated `app/layout.js`
 * so a theme can own `<html>`/`<body>` — fonts, body classes, page-level
 * chrome — while Makit keeps ownership of the attributes and injected nodes
 * the rest of the pipeline depends on.
 */
export function RootLayout({ htmlProps, bodyProps, bodyStart, children }: RootLayoutProps) {
  return (
    <html {...htmlProps}>
      <body {...bodyProps}>
        {bodyStart}
        {children}
      </body>
    </html>
  );
}
