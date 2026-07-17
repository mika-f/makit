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
      <summary className="cursor-pointer list-none rounded-[var(--makit-radius)] border border-[var(--makit-color-border)] px-3 py-1 text-sm text-[var(--makit-color-foreground)]">
        {current?.locales[locale]?.title ?? "Collections"}
      </summary>
      <div className="absolute z-10 mt-1 min-w-40 rounded-[var(--makit-radius)] border border-[var(--makit-color-border)] bg-[var(--makit-color-background)] p-2 shadow-lg">
        {visible.map((collection) => (
          <a
            key={collection.id}
            href={collection.locales[locale]!.rootRoute}
            aria-current={collection.id === currentCollectionId ? "page" : undefined}
            className={
              collection.id === currentCollectionId
                ? "block rounded-[var(--makit-radius)] bg-[var(--makit-color-muted)] px-2 py-1 text-sm font-medium text-[var(--makit-color-accent)]"
                : "block rounded-[var(--makit-radius)] px-2 py-1 text-sm text-[var(--makit-color-foreground)] hover:bg-[var(--makit-color-muted)]"
            }
          >
            {collection.locales[locale]!.title}
          </a>
        ))}
      </div>
    </details>
  );
}
