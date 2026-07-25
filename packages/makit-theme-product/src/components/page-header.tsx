import type { PageHeaderProps } from "@natsuneko-laboratory/makit-runtime";

export function PageHeader({ page }: PageHeaderProps) {
  // The nearest ancestor in the canonical hierarchy (spec §39) makes a good
  // eyebrow — "Guides", "API Reference" — without any extra configuration.
  const eyebrow = page.hierarchy.at(-1)?.title;

  return (
    <header className="mb-10">
      {eyebrow && (
        <p className="mb-3 text-[13px] font-semibold tracking-wide text-[var(--makit-color-accent)]">
          {eyebrow}
        </p>
      )}
      <h1 className="text-4xl font-semibold tracking-[-0.035em] sm:text-[2.6rem] sm:leading-[1.12]">
        {page.title}
      </h1>
      {page.description && (
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--makit-color-subtle)]">
          {page.description}
        </p>
      )}
    </header>
  );
}
