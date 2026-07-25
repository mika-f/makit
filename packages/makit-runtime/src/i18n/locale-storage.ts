/**
 * localStorage key holding the locale the visitor last landed on (spec §35.7).
 *
 * Written by `LocaleMemory` on every localized page and read back by the
 * locale gateway (`/`, and any locale-less deep link) so a returning visitor
 * keeps the language they were last reading in.
 *
 * Its own module, with no React import, so a client component can read it
 * without pulling the runtime's barrel — and with it the filesystem-backed
 * data loaders — into the client bundle. Re-exported from
 * `@natsuneko-laboratory/makit-runtime/client` for exactly that use.
 */
export const LOCALE_STORAGE_KEY = "makit-locale";
