import { defineTheme } from "@natsuneko-laboratory/makit/theme";

export default defineTheme({
  name: "@natsuneko-laboratory/makit-theme-terminal",
  styles: ["./styles/theme.css"],
  // Only the built components carry class names; scanning the package root
  // would drag `node_modules` in (THEME §13.1).
  tailwindSources: ["./dist/**/*.mjs"],
  defaults: {
    // The theme draws its own square corners; `radius` is deliberately not
    // honored (see README). "none" keeps the token consistent with the look.
    radius: "none",
    accentColor: "green",
    codeTheme: { light: "github-light", dark: "github-dark" },
  },
});
