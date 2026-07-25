import type { RootLayoutProps } from "@natsuneko-laboratory/makit-runtime";

/**
 * `data-makit-theme` scopes the corner reset in `styles/theme.css`, and
 * `.makit-terminal` carries the monospace stack. `bodyStart` must be rendered
 * first inside `<body>` (THEME §10.3) — it carries the CSS variables and the
 * pre-hydration color-scheme script.
 */
export function RootLayout({ htmlProps, bodyProps, bodyStart, children }: RootLayoutProps) {
  return (
    <html {...htmlProps} data-makit-theme="terminal">
      <body {...bodyProps} className="makit-terminal">
        {bodyStart}
        {children}
      </body>
    </html>
  );
}
