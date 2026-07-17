import { defineConfig } from "@natsuneko-laboratory/makit";

export default defineConfig({
  title: "Natsuneko Documentation",
  description: "Documentation for Natsuneko products and services.",

  collections: {
    mode: "discover",
  },

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
        title: "Products",
        items: [
          { title: "Makit", collection: "makit" },
          { title: "Enduroq", collection: "enduroq" },
        ],
      },
      {
        title: "Resources",
        items: [
          { title: "GitHub", href: "https://github.com/natsuneko-laboratory", external: true },
        ],
      },
    ],
  },

  home: {
    layout: "portal",
    sections: [
      {
        title: { "en-US": "Developer Tools", "ja-JP": "開発者向けツール" },
        collections: ["makit", "enduroq"],
      },
    ],
  },

  theme: {
    accentColor: "violet",
  },
});
