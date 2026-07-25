import type { PageHeaderProps } from "@natsuneko-laboratory/makit-runtime";

export function PageHeader({ page }: PageHeaderProps) {
  return (
    <header className="mb-8 border-b border-dashed border-[var(--makit-color-border)] pb-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        <span aria-hidden="true" className="mr-2 font-normal text-[var(--makit-color-accent)]">
          #
        </span>
        {page.title}
      </h1>
      {page.description && (
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--makit-color-subtle)]">
          {page.description}
        </p>
      )}
    </header>
  );
}
