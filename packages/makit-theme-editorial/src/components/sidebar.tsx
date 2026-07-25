import type { SidebarProps } from "@natsuneko-laboratory/makit-runtime";
import { NavigationItems as EditorialNavigationItems } from "./navigation-items.js";

export function Sidebar({ navigation, currentRoute, components }: SidebarProps) {
  if (navigation.length === 0) return null;
  const NavigationItems = components?.NavigationItems ?? EditorialNavigationItems;
  return (
    <>
      <aside className="sticky top-18 hidden h-[calc(100vh-4.5rem)] overflow-y-auto border-r border-[var(--makit-color-border)] py-8 pr-5 md:block">
        <nav aria-label="Documentation navigation">
          <NavigationItems items={navigation} currentRoute={currentRoute} />
        </nav>
      </aside>
      <details className="border-b border-[var(--makit-color-border)] px-5 py-4 md:hidden">
        <summary className="flex cursor-pointer list-none justify-between text-xs font-bold tracking-[0.14em] uppercase">
          Contents <span className="makit-editorial-marker">＋</span>
        </summary>
        <nav className="mt-4" aria-label="Documentation navigation">
          <NavigationItems items={navigation} currentRoute={currentRoute} />
        </nav>
      </details>
    </>
  );
}
