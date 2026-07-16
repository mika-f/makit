const THEME_STORAGE_KEY = "makit-theme";

// Runs before hydration (in <head>, spec §21.3 `colorScheme: "system"`) so the
// correct theme is applied before first paint — avoids a light/dark flash.
const SCRIPT = `(function(){try{var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var t=(s==="light"||s==="dark")?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}

export { THEME_STORAGE_KEY };
