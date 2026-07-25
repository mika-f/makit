import Link from "next/link";

/**
 * Takes no props of its own; `NotFoundPageProps` carries only `components`,
 * which this implementation does not need.
 */
export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--makit-color-background)] px-6 text-[var(--makit-color-foreground)]">
      <div className="w-full max-w-md border border-[var(--makit-color-border)] p-6 text-sm">
        <p className="text-[var(--makit-color-subtle)]">
          <span aria-hidden="true" className="mr-1.5 text-[var(--makit-color-accent)]">
            $
          </span>
          open .
        </p>
        <p className="mt-2">
          <span className="text-[var(--makit-color-accent)]">error</span>
          <span className="text-[var(--makit-color-subtle)]">: </span>
          404 — no such page
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex border border-[var(--makit-color-border)] px-3 py-1.5 text-[13px] transition hover:border-[var(--makit-color-accent)] hover:text-[var(--makit-color-accent)]"
        >
          cd ~
        </Link>
      </div>
    </div>
  );
}
