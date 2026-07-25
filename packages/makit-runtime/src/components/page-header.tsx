import type { GeneratedPage } from "../data/types.js";

export interface PageHeaderProps {
  page: GeneratedPage;
}

/** A page's title and description block (THEME §5.2). */
export function PageHeader({ page }: PageHeaderProps) {
  return (
    <>
      <h1 className="mb-4 text-4xl font-semibold tracking-[-0.035em] sm:text-[2.75rem] sm:leading-[1.1]">
        {page.title}
      </h1>
      {page.description && (
        <p className="mb-9 max-w-3xl text-lg leading-8 text-[var(--makit-color-subtle)]">
          {page.description}
        </p>
      )}
    </>
  );
}
