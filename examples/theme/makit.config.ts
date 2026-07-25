import { defineConfig } from "@natsuneko-laboratory/makit";

export default defineConfig({
  title: "Makit Theme Example",
  description: "Replacing Makit's built-in components.",
  siteUrl: "https://example.com",
  header: {
    title: "Theme Example",
    links: [{ label: "GitHub", href: "https://github.com/mika-f/makit", external: true }],
  },
  footer: {
    copyright: "© 2026 Makit contributors",
  },
  theme: {
    // Tokens: the first level of customization, no components involved.
    accentColor: "teal",
    radius: "large",

    // `theme/` is scanned automatically, so `theme/header.tsx`,
    // `theme/page-header.tsx`, and `theme/theme-toggle.tsx` need no
    // configuration at all. Everything below is the explicit form.
    components: {
      // A named export, from a file outside the convention directory.
      Footer: { from: "./src/site-footer.tsx", export: "SiteFooter" },
      // Some components can be removed outright.
      PrevNextLinks: false,
    },
  },
});
