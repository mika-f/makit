import Link from "next/link";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--makit-color-background)] text-[var(--makit-color-foreground)]">
      <h1 className="text-5xl font-bold">404</h1>
      <p className="opacity-80">This page could not be found.</p>
      <Link href="/" className="text-[var(--makit-color-accent)] hover:underline">
        Go home
      </Link>
    </div>
  );
}
