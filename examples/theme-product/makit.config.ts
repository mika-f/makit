import { defineConfig } from "@natsuneko-laboratory/makit";

export default defineConfig({
  title: "Makit Product Theme",
  description:
    "A polished theme for product documentation, with soft cards, pill navigation, and a gradient home.",
  siteUrl: "https://example.com",
  header: {
    title: "makit-theme-product",
    links: [
      { label: "Changelog", href: "/guides/tokens/" },
      { label: "GitHub", href: "https://github.com/mika-f/makit", external: true },
    ],
  },
  footer: {
    copyright: "© 2026 Makit contributors",
    links: [{ label: "MIT License", href: "https://github.com/mika-f/makit", external: true }],
  },
  theme: {
    // The theme's manifest already supplies `radius: "large"` and
    // `accentColor: "indigo"`; this overrides the accent to show that the
    // project's own config takes priority over manifest defaults.
    extends: "@natsuneko-laboratory/makit-theme-product",
    accentColor: "violet",
  },
});
