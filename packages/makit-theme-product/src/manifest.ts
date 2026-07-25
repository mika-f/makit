import { defineTheme } from "@natsuneko-laboratory/makit/theme";

export default defineTheme({
  name: "@natsuneko-laboratory/makit-theme-product",
  styles: ["./styles/theme.css"],
  // Only the built components carry class names; scanning the package root
  // would drag `node_modules` in (THEME §13.1).
  tailwindSources: ["./dist/**/*.mjs"],
  defaults: {
    radius: "large",
    accentColor: "indigo",
  },
});
