import { defineConfig } from "./packages/makit/src/index.ts";

export default defineConfig({
  title: "Makit",
  description: "Markdown から静的なドキュメントサイトを生成する CLI",
  lang: "ja-JP",
  sourceDir: "public",
  publicDir: "assets",
  outDir: "dist",
  header: {
    title: "Makit",
    links: [
      {
        label: "GitHub",
        href: "https://github.com/mika-f/makit",
        external: true,
      },
    ],
  },
  footer: {
    copyright: "© 2026 Makit contributors",
    links: [
      {
        label: "GitHub で見る",
        href: "https://github.com/mika-f/makit",
        external: true,
      },
    ],
  },
  theme: {
    accentColor: "violet",
    colorScheme: "system",
    radius: "medium",
  },
  styles: ["styles/custom.css"],
  markdown: {
    code: {
      copyButton: true,
      lineNumbers: true,
    },
  },
  navigation: {
    auto: {
      numericPrefixes: true,
      unorderedPosition: "last",
    },
    pagination: {
      enabled: true,
      crossSection: true,
    },
  },
});
