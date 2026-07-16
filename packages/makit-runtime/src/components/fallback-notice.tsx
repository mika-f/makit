import type { GeneratedPage, I18nData } from "../data/types.js";

/** Notice shown on a `render`-behavior fallback page (spec §16.9). */
export function FallbackNotice({ page, i18n }: { page: GeneratedPage; i18n: I18nData }) {
  if (!page.isFallback || !i18n.fallback.showNotice) return null;

  const message = i18n.messages[page.locale]?.fallbackNotice ?? i18n.messages.en?.fallbackNotice;
  if (!message) return null;

  return (
    <div
      role="note"
      className="mb-6 rounded-[var(--makit-radius)] border border-[var(--makit-color-accent)] bg-[var(--makit-color-muted)] px-4 py-3 text-sm text-[var(--makit-color-foreground)]"
    >
      {message}
    </div>
  );
}
