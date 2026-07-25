import Link from "next/link";
import type { FooterProps } from "@natsuneko-laboratory/makit-runtime";

/**
 * The `Footer` slot. This file is outside the `theme/` directory and uses a
 * named export, so `makit.config.ts` points at it explicitly:
 *
 * ```ts
 * components: { Footer: { from: "./src/site-footer.tsx", export: "SiteFooter" } }
 * ```
 */
export function SiteFooter({ footer }: FooterProps) {
  return (
    <footer className="border-t border-[var(--makit-color-border)] bg-[var(--makit-color-muted)] px-6 py-10 text-sm">
      <div className="mx-auto flex max-w-5xl flex-col gap-2">
        <strong className="text-[var(--makit-color-foreground)]">Makit Theme Example</strong>
        <p className="text-[var(--makit-color-subtle)]">
          Built with a replaced header, title block, footer, and theme toggle.
        </p>
        <p className="text-[var(--makit-color-subtle)]">
          {footer.copyright} ·{" "}
          <Link href="/" className="underline underline-offset-2">
            Home
          </Link>
        </p>
      </div>
    </footer>
  );
}
