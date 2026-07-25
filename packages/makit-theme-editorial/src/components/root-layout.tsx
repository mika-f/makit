import type { RootLayoutProps } from "@natsuneko-laboratory/makit-runtime";

export function RootLayout({ htmlProps, bodyProps, bodyStart, children }: RootLayoutProps) {
  return (
    <html {...htmlProps} data-makit-theme="editorial">
      <body {...bodyProps} className="makit-editorial">
        {bodyStart}
        {children}
      </body>
    </html>
  );
}
