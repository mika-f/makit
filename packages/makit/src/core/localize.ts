import type { LocalizedValue } from "../metadata/types.js";
import type { ResolvedLocaleConfig } from "../types/resolved-config.js";

/**
 * Resolves a `string | LocalizedValue<string>` field for one locale: exact
 * BCP-47 tag, then the lowercase URL-facing form, then the first defined
 * value (spec §11.2, §15.2, §33.2).
 */
export function localizeValue(
  value: string | LocalizedValue<string> | undefined,
  locale: ResolvedLocaleConfig,
  fallback?: string,
): string | undefined {
  if (value === undefined) return fallback;
  if (typeof value === "string") return value;
  return value[locale.locale] ?? value[locale.urlLocale] ?? Object.values(value)[0] ?? fallback;
}
