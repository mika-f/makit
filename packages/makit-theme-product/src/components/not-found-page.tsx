import Link from "next/link";
import { ArrowRight } from "./icons.js";

/**
 * Takes no props of its own; `NotFoundPageProps` carries only `components`,
 * which this implementation does not need.
 */
export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--makit-color-background)] px-6 text-[var(--makit-color-foreground)]">
      <div className="text-center">
        <p className="bg-linear-to-br from-[var(--makit-color-accent)] to-[color-mix(in_srgb,var(--makit-color-accent)_45%,var(--makit-color-foreground))] bg-clip-text text-7xl font-bold tracking-tight text-transparent">
          404
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-[var(--makit-color-subtle)]">
          The page you were looking for does not exist.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--makit-color-accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          Back to documentation
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
