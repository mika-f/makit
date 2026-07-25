import { defineConfig } from "@natsuneko-laboratory/makit";

export default defineConfig({
  title: "Makit Brutalist",
  description: "A loud, structural theme for documentation that refuses to disappear.",
  siteUrl: "https://example.com",
  header: {
    title: "Makit / Brutalist",
    links: [
      { label: "Principles", href: "/guides/principles/" },
      { label: "Source", href: "https://github.com/mika-f/makit", external: true },
    ],
  },
  footer: {
    copyright: "Built in public · 2026",
    links: [{ label: "MIT License", href: "https://github.com/mika-f/makit", external: true }],
  },
  theme: {
    extends: "@natsuneko-laboratory/makit-theme-brutalist",
  },
});
