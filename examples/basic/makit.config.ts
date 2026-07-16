import { defineConfig } from "makit";

export default defineConfig({
  title: "Makit E2E Test",
  description: "End-to-end test site for Makit",
  siteUrl: "https://example.com",
  i18n: {
    defaultLocale: "en-US",
    locales: [
      { locale: "en-US", label: "English" },
      { locale: "ja-JP", label: "日本語" },
    ],
    fallback: { enabled: true, behavior: "render", showNotice: true },
  },
  header: {
    title: "Makit E2E",
    links: [{ label: "GitHub", href: "https://github.com/example/makit", external: true }],
  },
  footer: {
    copyright: "© 2026 Makit contributors",
  },
  theme: {
    accentColor: "violet",
  },
});
