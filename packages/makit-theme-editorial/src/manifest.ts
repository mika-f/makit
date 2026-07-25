import { defineTheme } from "@natsuneko-laboratory/makit/theme";

export default defineTheme({
  name: "@natsuneko-laboratory/makit-theme-editorial",
  styles: ["./styles/theme.css"],
  tailwindSources: ["./dist/**/*.mjs"],
  defaults: {
    radius: "small",
    accentColor: "oxblood",
    codeTheme: { light: "github-light", dark: "github-dark" },
  },
});
