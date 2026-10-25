/**
 * `next/navigation`, re-exported so theme code can use the App Router hooks
 * (`usePathname`, `useSearchParams`, ...) and helpers (`notFound`, ...)
 * without depending on `next` itself (THEME §11).
 *
 * A theme package is resolved from the user's project, where `next` is
 * usually out of reach (spec §5.3); this package already peers on it, so both
 * the module and its types resolve from here. At build time the generated
 * app aliases this subpath like the rest of makit-runtime.
 */
export * from "next/navigation";
