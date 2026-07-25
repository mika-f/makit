import { defineTheme } from "@natsuneko-laboratory/makit/theme";

export default defineTheme({
  name: "@natsuneko-laboratory/makit-theme-brutalist",
  styles: ["./styles/theme.css"],
  tailwindSources: ["./dist/**/*.mjs"],
  defaults: {
    radius: "none",
    accentColor: "signal",
    codeTheme: { light: "github-light", dark: "github-dark" },
  },
});
