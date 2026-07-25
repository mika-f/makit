import type { PageHeaderProps } from "@natsuneko-laboratory/makit-runtime";

export function PageHeader({ page }: PageHeaderProps) {
  const section = page.hierarchy.at(-1)?.title;
  return (
    <header className="mb-12 border-b border-[var(--makit-color-border-strong)] pb-10">
      {section && (
        <p className="mb-4 text-xs font-bold tracking-[0.18em] text-[var(--makit-color-accent)] uppercase">
          {section}
        </p>
      )}
      <h1 className="makit-editorial-display max-w-3xl text-4xl leading-[1.08] font-semibold tracking-[-0.025em] sm:text-5xl">
        {page.title}
      </h1>
      {page.description && (
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--makit-color-subtle)]">
          {page.description}
        </p>
      )}
    </header>
  );
}
