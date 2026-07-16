import type { NavigationGroup } from "../data/types.js";
import { NavigationItems } from "./navigation-items.js";

function SidebarGroups({
  groups,
  currentRoute,
}: {
  groups: readonly NavigationGroup[];
  currentRoute: string;
}) {
  return (
    <nav className="space-y-4" aria-label="Documentation navigation">
      {groups.map((group, index) => (
        <div key={group.title ?? `group-${index}`}>
          {group.title && (
            <h2 className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-[var(--makit-color-foreground)] opacity-60">
              {group.title}
            </h2>
          )}
          <NavigationItems items={group.items} currentRoute={currentRoute} />
        </div>
      ))}
    </nav>
  );
}

export function Sidebar({
  groups,
  currentRoute,
}: {
  groups: readonly NavigationGroup[];
  currentRoute: string;
}) {
  if (groups.length === 0) return null;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-[var(--makit-color-border)] p-4 md:block">
        <SidebarGroups groups={groups} currentRoute={currentRoute} />
      </aside>

      {/* Mobile nav: a zero-JS <details> disclosure */}
      <details className="border-b border-[var(--makit-color-border)] p-4 md:hidden">
        <summary className="cursor-pointer text-sm font-medium text-[var(--makit-color-foreground)]">
          Menu
        </summary>
        <div className="mt-3">
          <SidebarGroups groups={groups} currentRoute={currentRoute} />
        </div>
      </details>
    </>
  );
}
