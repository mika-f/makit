import type { SidebarProps } from "@natsuneko-laboratory/makit-runtime";
import { ChevronDown } from "./icons.js";
import { NavigationItems as ProductNavigationItems } from "./navigation-items.js";

export function Sidebar({ navigation, currentRoute, components }: SidebarProps) {
  if (navigation.length === 0) return null;

  // Honor a `NavigationItems` override layered on top of this theme
  // (THEME §12); fall back to this theme's own list, not the standard one.
  const NavigationItems = components?.NavigationItems ?? ProductNavigationItems;

  return (
    <>
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] overflow-y-auto px-4 py-8 md:block">
        <nav aria-label="Documentation navigation">
          <NavigationItems items={navigation} currentRoute={currentRoute} />
        </nav>
      </aside>

      {/* Mobile: a JS-free disclosure holding the same tree. */}
      <details className="border-b border-[var(--makit-color-border)] px-5 py-3 md:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-[var(--makit-color-foreground)]">
          Documentation
          <ChevronDown className="makit-product-marker size-4 text-[var(--makit-color-subtle)] transition-transform" />
        </summary>
        <nav className="mt-3" aria-label="Documentation navigation">
          <NavigationItems items={navigation} currentRoute={currentRoute} />
        </nav>
      </details>
    </>
  );
}
