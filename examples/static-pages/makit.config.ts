import { defineConfig } from "@natsuneko-laboratory/makit";

export default defineConfig({
  title: "Static Pages Example",
  description: "Landing pages and custom pages next to Markdown documentation.",
  siteUrl: "https://example.com",
  // Exercises the basePath handling of links in HTML static pages.
  basePath: "/docs",

  i18n: {
    defaultLocale: "en-US",
    locales: [
      { locale: "en-US", label: "English" },
      { locale: "ja-JP", label: "日本語" },
    ],
  },

  navigation: {
    global: [
      {
        items: [
          { title: "Docs", href: "/en-us/getting-started/" },
          { title: "Pricing", href: "/en-us/pricing/" },
          { title: "About", href: "/en-us/about/" },
        ],
      },
    ],
  },

  llms: { enabled: true },
});
