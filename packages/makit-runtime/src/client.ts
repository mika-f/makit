/**
 * Primitives that are safe to import from a Client Component (THEME §11).
 *
 * The package's main entry re-exports the data loaders, which read the
 * filesystem; importing a plain value from it inside a `"use client"` module
 * can drag those into the client bundle, so anything a client component needs
 * is re-exported here from a React-free module instead.
 */
export { THEME_STORAGE_KEY } from "./theme/storage-key.js";
export { LOCALE_STORAGE_KEY } from "./i18n/locale-storage.js";
