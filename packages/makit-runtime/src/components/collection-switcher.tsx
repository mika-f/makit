import type { CollectionData } from "../data/types.js";

/** Switches between collections in the current locale (spec §38 Collection Switcher). */
export function CollectionSwitcher({
  collections,
  currentCollectionId,
  locale,
}: {
  collections: readonly CollectionData[];
  currentCollectionId?: string;
  locale: string;
}) {
  const visible = collections.filter(
    (collection) => !collection.hidden && collection.locales[locale],
  );
  if (visible.length < 2) return null;

  const current = visible.find((collection) => collection.id === currentCollectionId);

  return (
    <details className="relative inline-block">
      <summary className="hidden h-9 cursor-pointer list-none items-center rounded-lg border border-[var(--makit-color-border)] px-3 text-sm text-[var(--makit-color-subtle)] transition hover:text-[var(--makit-color-foreground)] lg:flex">
        {current?.locales[locale]?.title ?? "Collections"}
      </summary>
      <div className="absolute right-0 z-20 mt-2 min-w-44 rounded-xl border border-[var(--makit-color-border)] bg-[var(--makit-color-surface)] p-1.5 shadow-xl">
        {visible.map((collection) => (
          <a
            key={collection.id}
            href={collection.locales[locale]!.rootRoute}
            aria-current={collection.id === currentCollectionId ? "page" : undefined}
            className={
              collection.id === currentCollectionId
                ? "block rounded-lg bg-[var(--makit-color-muted)] px-2.5 py-2 text-sm font-medium text-[var(--makit-color-foreground)]"
                : "block rounded-lg px-2.5 py-2 text-sm text-[var(--makit-color-subtle)] hover:bg-[var(--makit-color-muted)] hover:text-[var(--makit-color-foreground)]"
            }
          >
            {collection.locales[locale]!.title}
          </a>
        ))}
      </div>
    </details>
  );
}
