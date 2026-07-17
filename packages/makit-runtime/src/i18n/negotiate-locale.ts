// General-purpose BCP-47 language negotiation (spec §35.3).
//
// Given the site's available locales and an ordered list of a visitor's
// preferred language tags (e.g. `navigator.languages`), pick the best-fitting
// locale. The algorithm is intentionally independent of any particular site
// configuration so it handles single-region setups (`en-US` / `ja-JP`) as well
// as multi-region (`en-US` / `en-GB`) and script subtags (`zh-Hant-TW`).

/** Split a BCP-47 tag into lowercased, non-empty subtags: `"zh-Hant-TW" → ["zh","hant","tw"]`. */
function toSubtags(tag: string): string[] {
  return tag.toLowerCase().split("-").filter(Boolean);
}

/**
 * Score how well an available locale satisfies one requested language tag.
 *
 * Returns `0` when the primary language subtags differ — a request for `ja` is
 * never satisfied by `en-US`. Otherwise the score grows with agreement depth so
 * that, for the same request, an exact match beats a script/region match, which
 * beats a bare-language match, which beats a sibling region:
 *
 * ```text
 * request "en-US":  en-US (exact) > en (generic) > en-GB (sibling region)
 * request "zh-Hant-TW":  zh-Hant-TW > zh-Hant > zh-Hans-CN
 * ```
 */
function matchQuality(request: readonly string[], available: readonly string[]): number {
  if (request.length === 0 || available.length === 0) return 0;
  if (request[0] !== available[0]) return 0; // primary language must agree

  // Count shared leading subtags (script/region agreement) beyond the language.
  let shared = 1;
  while (
    shared < request.length &&
    shared < available.length &&
    request[shared] === available[shared]
  ) {
    shared += 1;
  }

  const requestExtra = request.length - shared; // requested subtags left unmatched
  const availableExtra = available.length - shared; // offered subtags left unmatched

  // Reward agreement depth; penalize an over-specific request more than an
  // over-specific offer so `req extends avail` (en-US→en) outranks a sibling
  // region (en-US→en-GB), and both stay well below an exact match. All non-zero
  // scores differ by whole numbers, leaving room for a fractional tiebreak.
  return 1000 + shared * 10 - requestExtra * 3 - availableExtra;
}

/** A locale the site can serve. Only the BCP-47 `locale` tag drives negotiation. */
export interface LocaleCandidate {
  /** BCP-47 language tag, e.g. `"en-US"`, `"zh-Hant-TW"`. */
  locale: string;
}

export interface NegotiateLocaleOptions {
  /**
   * BCP-47 tag of the site's default locale. Used only to break exact ties —
   * e.g. a bare `"en"` request against both `en-US` and `en-GB`. It never
   * outranks a genuinely closer match.
   */
  default?: string;
}

/**
 * Choose the best available locale for a visitor's ordered language preferences.
 *
 * Preferences are honored in order (mirroring `navigator.languages` / an
 * `Accept-Language` q-ordering): the first requested tag that matches *any*
 * candidate wins, and only then is the closest candidate for that tag selected.
 * This is what keeps a first-choice `ja` (matched by language) from losing to a
 * second-choice `en-US` (matched exactly) — a subtle ordering bug in naive
 * "all exact matches first, then all prefix matches" implementations.
 *
 * Returns `undefined` when no preference shares a language with any candidate,
 * letting the caller fall back to its own default.
 */
export function negotiateLocale<T extends LocaleCandidate>(
  candidates: readonly T[],
  requested: readonly string[],
  options: NegotiateLocaleOptions = {},
): T | undefined {
  if (candidates.length === 0) return undefined;

  const defaultTag = options.default?.toLowerCase();
  const prepared = candidates.map((candidate) => ({
    candidate,
    subtags: toSubtags(candidate.locale),
    isDefault: defaultTag != null && candidate.locale.toLowerCase() === defaultTag,
  }));

  for (const tag of requested) {
    const request = toSubtags(tag);
    if (request.length === 0) continue;

    let best: T | undefined;
    let bestScore = 0;
    for (const entry of prepared) {
      const score = matchQuality(request, entry.subtags);
      if (score <= 0) continue;
      // Half-point nudge: lets the default locale win ties without ever beating
      // a closer match (whose scores differ by at least 1). Applied only to
      // real language matches, so it can't resurrect a 0-score candidate.
      const adjusted = entry.isDefault ? score + 0.5 : score;
      if (adjusted > bestScore) {
        bestScore = adjusted;
        best = entry.candidate;
      }
    }
    if (best) return best;
  }

  return undefined;
}
