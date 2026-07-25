import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Not a slot name, so Makit ignores this file — helper modules can live
 * alongside the components that import them.
 *
 * `next/link` resolves even though this project does not depend on Next.js:
 * Makit aliases the copy it uses itself.
 */
export function Banner({ children, href }: { children: ReactNode; href: string }) {
  return (
    <div className="bg-[var(--makit-color-accent)] px-5 py-2 text-center text-sm text-white">
      {children}{" "}
      <Link href={href} className="font-semibold underline underline-offset-2">
        See how
      </Link>
    </div>
  );
}
