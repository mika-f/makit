# Tokens

The manifest establishes the theme with no required project configuration.

## Named accents

Each named accent carries an accessible text color and a brighter highlight
used for blocks and shadows.

| Name     | Direction           |
| -------- | ------------------- |
| `signal` | Construction yellow |
| `orange` | Industrial orange   |
| `lime`   | Electric green      |
| `cyan`   | Technical blue      |
| `pink`   | Poster magenta      |
| `violet` | Digital purple      |

## Changing the signal

```ts title="makit.config.ts"
theme: {
  extends: "@natsuneko-laboratory/makit-theme-brutalist",
  accentColor: "cyan",
}
```

Custom CSS colors are accepted too. For a custom value, the same color is used
for both text and highlight roles, so check contrast in both color schemes.

## Square geometry

The manifest sets `radius: "none"`, and the stylesheet enforces square corners
on inherited Makit controls. This is a deliberate part of the theme identity.
