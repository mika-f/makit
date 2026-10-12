import type { ReactNode } from "react";
import type { SearchEntry, SiteData } from "../data/types.js";
import type { ThemeComponents } from "../theme/components.js";

export interface HeaderActionsProps {
  site: SiteData;
  searchEntries: SearchEntry[];
  components: ThemeComponents;
  /** Rendered between the search dialog and the theme toggle. */
  children?: ReactNode;
}

/**
 * The actions every page shell passes to `Header` (STATIC-PAGES §10.3):
 * search, the shell's own switchers, then the theme toggle. Internal — not
 * a slot, so the slot props it feeds stay unchanged.
 */
export function HeaderActions({
  site,
  searchEntries,
  components: C,
  children,
}: HeaderActionsProps) {
  return (
    <>
      <C.SearchDialog
        entries={searchEntries}
        pagefindEnabled={process.env.NODE_ENV === "production"}
        pagefindBundlePath={`${site.basePath}/pagefind/`}
      />
      {children}
      {site.theme.colorScheme === "system" && <C.ThemeToggle />}
    </>
  );
}
