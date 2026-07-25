import type { RootLayoutProps } from "@natsuneko-laboratory/makit-runtime";

/**
 * `bodyStart` must be rendered first inside `<body>` (THEME §10.3) — it
 * carries the CSS variables and the pre-hydration color-scheme script.
 */
export function RootLayout({ htmlProps, bodyProps, bodyStart, children }: RootLayoutProps) {
  return (
    <html {...htmlProps} data-makit-theme="product">
      <body {...bodyProps} className="makit-product antialiased">
        {bodyStart}
        {children}
      </body>
    </html>
  );
}
