import { THEME_STORAGE_KEY } from "./storage-key.js";

// Runs before hydration (in <head>, spec §21.3 `colorScheme: "system"`) so the
// correct theme is applied before first paint — avoids a light/dark flash.
const SCRIPT = `(function(){try{var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var t=(s==="light"||s==="dark")?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

/** `ThemeScript` takes no props; the type exists so a replacement can annotate itself (THEME §6). */
export type ThemeScriptProps = Record<string, never>;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
