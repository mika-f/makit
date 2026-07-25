import type { ResolvedNavNode } from "../data/types.js";
import type { ThemeComponents } from "../theme/components.js";
import { NavigationItems as DefaultNavigationItems } from "./navigation-items.js";

export interface SidebarProps {
  navigation: readonly ResolvedNavNode[];
  currentRoute: string;
  /**
   * The resolved slot map, so that a `NavigationItems` override also applies
   * inside the standard sidebar (THEME §12). Callers that do not customize
   * slots may omit it.
   */
  components?: ThemeComponents;
}

export function Sidebar({ navigation, currentRoute, components }: SidebarProps) {
  if (navigation.length === 0) return null;

  const NavigationItems = components?.NavigationItems ?? DefaultNavigationItems;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] overflow-y-auto border-r border-[var(--makit-color-border)] px-4 py-8 md:block">
        <nav className="space-y-6" aria-label="Documentation navigation">
          <NavigationItems items={navigation} currentRoute={currentRoute} />
        </nav>
      </aside>

      {/* Mobile nav: a zero-JS <details> disclosure */}
      <details className="border-b border-[var(--makit-color-border)] px-5 py-3 md:hidden">
        <summary className="cursor-pointer list-none text-sm font-medium text-[var(--makit-color-foreground)]">
          <span className="flex items-center justify-between">
            Navigation <span aria-hidden="true">⌄</span>
          </span>
        </summary>
        <nav className="mt-3 space-y-4" aria-label="Documentation navigation">
          <NavigationItems items={navigation} currentRoute={currentRoute} />
        </nav>
      </details>
    </>
  );
}
