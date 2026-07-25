/**
 * localStorage key holding the visitor's chosen color scheme.
 *
 * Its own module, with no React import, so a client component can read it
 * without pulling the runtime's barrel — and with it the filesystem-backed
 * data loaders — into the client bundle. Re-exported from
 * `@natsuneko-laboratory/makit-runtime/client` for exactly that use.
 */
export const THEME_STORAGE_KEY = "makit-theme";
