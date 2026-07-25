import { defineConfig } from "@natsuneko-laboratory/makit";

export default defineConfig({
  title: "The Makit Editorial",
  description: "An editorial theme for long-form documentation and handbooks.",
  siteUrl: "https://example.com",
  header: {
    title: "The Makit Editorial",
    links: [
      { label: "Style guide", href: "/guides/style-guide/" },
      { label: "GitHub", href: "https://github.com/mika-f/makit", external: true },
    ],
  },
  footer: {
    copyright: "Volume I · 2026 · Makit contributors",
    links: [{ label: "MIT License", href: "https://github.com/mika-f/makit", external: true }],
  },
  theme: {
    extends: "@natsuneko-laboratory/makit-theme-editorial",
  },
});
