import type { SidebarProps } from "@natsuneko-laboratory/makit-runtime";
import { NavigationItems as TerminalNavigationItems } from "./navigation-items.js";

export function Sidebar({ navigation, currentRoute, components }: SidebarProps) {
  if (navigation.length === 0) return null;

  // Honor a `NavigationItems` override layered on top of this theme
  // (THEME §12); fall back to this theme's own tree, not the standard one.
  const NavigationItems = components?.NavigationItems ?? TerminalNavigationItems;

  return (
    <>
      <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-[var(--makit-color-border)] px-3 py-6 md:block">
        <div className="mb-3 px-2 text-[10px] tracking-[0.2em] text-[var(--makit-color-subtle)] uppercase">
          <span aria-hidden="true" className="text-[var(--makit-color-accent)]">
            —{" "}
          </span>
          index
        </div>
        <nav aria-label="Documentation navigation">
          <NavigationItems items={navigation} currentRoute={currentRoute} />
        </nav>
      </aside>

      {/* Mobile: a JS-free disclosure, matching the sidebar's tree. */}
      <details className="border-b border-[var(--makit-color-border)] px-4 py-2.5 md:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] text-[var(--makit-color-foreground)]">
          <span>
            <span aria-hidden="true" className="text-[var(--makit-color-accent)]">
              ${" "}
            </span>
            index
          </span>
          <span aria-hidden="true" className="makit-nav-marker text-[10px] opacity-60" />
        </summary>
        <nav className="mt-3" aria-label="Documentation navigation">
          <NavigationItems items={navigation} currentRoute={currentRoute} />
        </nav>
      </details>
    </>
  );
}
