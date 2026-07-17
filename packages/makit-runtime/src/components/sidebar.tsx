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
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] overflow-y-auto border-r border-[var(--makit-color-border)] px-4 py-8 md:block">
        <nav className="space-y-6" aria-label="Documentation navigation">
          <NavigationItems items={navigation} currentRoute={currentRoute} />
        </nav>
      </aside>

      {/* Mobile nav: a zero-JS <details> disclosure */}
      <details className="border-b border-[var(--makit-color-border)] px-5 py-3 md:hidden">
        <summary className="cursor-pointer list-none text-sm font-medium text-[var(--makit-color-foreground)]">
          <span className="flex items-center justify-between">Navigation <span aria-hidden="true">⌄</span></span>
        </summary>
        <nav className="mt-3 space-y-4" aria-label="Documentation navigation">
          <NavigationItems items={navigation} currentRoute={currentRoute} />
        </nav>
      </details>
    </>
  );
}
