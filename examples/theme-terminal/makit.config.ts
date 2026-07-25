import { defineConfig } from "@natsuneko-laboratory/makit";

export default defineConfig({
  title: "Makit Terminal Theme",
  description: "A monospace, square-cornered theme for CLI and infrastructure documentation.",
  siteUrl: "https://example.com",
  header: {
    title: "makit-theme-terminal",
    links: [{ label: "GitHub", href: "https://github.com/mika-f/makit", external: true }],
  },
  footer: {
    copyright: "© 2026 Makit contributors",
    links: [{ label: "MIT License", href: "https://github.com/mika-f/makit", external: true }],
  },
  theme: {
    // The whole page shell comes from the theme package. Its manifest supplies
    // `radius: "none"` and `accentColor: "green"`, so nothing else is needed —
    // anything set here would take priority over those defaults.
    extends: "@natsuneko-laboratory/makit-theme-terminal",
  },
});
