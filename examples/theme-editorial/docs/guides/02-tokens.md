# Tokens

The manifest supplies defaults that establish the theme's character without
requiring project configuration.

## Accents

Named accents provide separate light and dark values.

| Name      | Character                |
| --------- | ------------------------ |
| `oxblood` | Classic editorial red    |
| `rust`    | Warm and archival        |
| `forest`  | Scholarly and natural    |
| `navy`    | Formal and technical     |
| `plum`    | Literary and understated |
| `gold`    | Historical and warm      |

Any CSS color is also accepted. Named values are recommended because each pair
is tuned for the paper and ink backgrounds.

## Radius

The default `small` radius softens controls without making them feel like
product-interface cards. All standard Makit radius options remain available.

```ts title="makit.config.ts"
theme: {
  extends: "@natsuneko-laboratory/makit-theme-editorial",
  accentColor: "forest",
  radius: "none",
}
```

## Project overrides

Theme CSS loads before project styles. A publication can therefore supply its
own licensed font and replace only the two editorial font stacks.
