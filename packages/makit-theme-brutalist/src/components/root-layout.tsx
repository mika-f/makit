import type { RootLayoutProps } from "@natsuneko-laboratory/makit-runtime";

export function RootLayout({ htmlProps, bodyProps, bodyStart, children }: RootLayoutProps) {
  return (
    <html {...htmlProps} data-makit-theme="brutalist">
      <body {...bodyProps} className="makit-brutalist">
        {bodyStart}
        {children}
      </body>
    </html>
  );
}
