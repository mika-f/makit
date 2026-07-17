import { defineConfig } from "./packages/makit/src/index.ts";

export default defineConfig({
  title: "Makit",
  description: "A CLI for generating static documentation sites from Markdown.",
  lang: "en-US",
  sourceDir: "public",
  // Keep the documentation site's visual identity in the brand package.
  publicDir: "packages/makit-brand/src",
  outDir: "dist",
  header: {
    title: "Makit",
    logo: "/makit-mark-monochrome.svg",
    logoDark: "/makit-mark.svg",
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
  llms: {
    enabled: true,
  },
  github: {
    repository: "mika-f/makit",
  },
  i18n: {
    defaultLocale: "en-US",
    locales: [
      { locale: "en-US", label: "English" },
      { locale: "ja-JP", label: "日本語" },
    ],
    root: { behavior: "detect" },
    messages: {
      "ja-JP": {
        fallbackNotice: "このページはまだ翻訳されていません。既定の言語版を表示しています。",
        home: "ホーム",
      },
      "en-US": {
        fallbackNotice:
          "This page has not been translated yet. Showing the default language version.",
        home: "Home",
      },
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
