export interface AccentColorValue {
  light: string;
  dark: string;
}

// A small named palette so `theme.accentColor: "violet"` works out of the box
// (spec §21.3 example). Any value that isn't a known name here is assumed to
// already be a valid CSS color and is used as-is for both schemes.
const NAMED_ACCENTS: Record<string, AccentColorValue> = {
  violet: { light: "#7c3aed", dark: "#a78bfa" },
  blue: { light: "#2563eb", dark: "#60a5fa" },
  green: { light: "#16a34a", dark: "#4ade80" },
  red: { light: "#dc2626", dark: "#f87171" },
  orange: { light: "#ea580c", dark: "#fb923c" },
  pink: { light: "#db2777", dark: "#f472b6" },
  teal: { light: "#0d9488", dark: "#2dd4bf" },
  gray: { light: "#4b5563", dark: "#9ca3af" },
};

export function resolveAccentColor(accentColor: string | undefined): AccentColorValue {
  if (!accentColor) return NAMED_ACCENTS.violet!;
  const named = NAMED_ACCENTS[accentColor.toLowerCase()];
  if (named) return named;
  return { light: accentColor, dark: accentColor };
}

const RADIUS_VALUES: Record<string, string> = {
  none: "0px",
  small: "0.25rem",
  medium: "0.5rem",
  large: "1rem",
};

export function resolveRadius(radius: string): string {
  return RADIUS_VALUES[radius] ?? RADIUS_VALUES.medium!;
}
