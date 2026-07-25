import type { PageHeaderProps } from "@natsuneko-laboratory/makit-runtime";

/**
 * The `PageHeader` slot: a page's title block, replaced outright rather than
 * wrapped. Anything on `page` is available here — this one surfaces the
 * page's own taxonomy tags.
 */
export default function PageHeader({ page }: PageHeaderProps) {
  const tags = page.taxonomy?.tags ?? [];

  return (
    <header className="mb-10 border-b border-[var(--makit-color-border)] pb-6">
      {tags.length > 0 && (
        <ul className="mb-3 flex gap-2">
          {tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-[color-mix(in_srgb,var(--makit-color-accent)_14%,transparent)] px-2.5 py-0.5 text-xs font-medium text-[var(--makit-color-accent)]"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}
      <h1 className="text-4xl font-semibold tracking-tight">{page.title}</h1>
      {page.description && (
        <p className="mt-3 text-lg text-[var(--makit-color-subtle)]">{page.description}</p>
      )}
    </header>
  );
}
