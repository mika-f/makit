import type { ResolvedNavNode } from "../data/types.js";
import { NavigationItems } from "./navigation-items.js";

export function Sidebar({
  navigation,
  currentRoute,
}: {
  navigation: readonly ResolvedNavNode[];
  currentRoute: string;
}) {
  if (navigation.length === 0) return null;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-[var(--makit-color-border)] p-4 md:block">
        <nav className="space-y-4" aria-label="Documentation navigation">
          <NavigationItems items={navigation} currentRoute={currentRoute} />
        </nav>
      </aside>

      {/* Mobile nav: a zero-JS <details> disclosure */}
      <details className="border-b border-[var(--makit-color-border)] p-4 md:hidden">
        <summary className="cursor-pointer text-sm font-medium text-[var(--makit-color-foreground)]">
          Menu
        </summary>
        <nav className="mt-3 space-y-4" aria-label="Documentation navigation">
          <NavigationItems items={navigation} currentRoute={currentRoute} />
        </nav>
      </details>
    </>
  );
}
