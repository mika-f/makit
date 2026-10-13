/** Enhances generated tab HTML; before hydration all panels remain readable. */
export function enhanceTabs(root: HTMLElement): () => void {
  const cleanups: (() => void)[] = [];
  const revealAnchor: ((target: HTMLElement) => boolean)[] = [];

  for (const group of root.querySelectorAll<HTMLElement>("[data-makit-tabs]")) {
    const buttons = [
      ...group.querySelectorAll<HTMLButtonElement>(":scope > .makit-tab-list > [role=tab]"),
    ];
    const panels = [...group.querySelectorAll<HTMLElement>(":scope > [role=tabpanel]")];
    if (!buttons.length || buttons.length !== panels.length) continue;
    const initial = Math.max(
      0,
      buttons.findIndex((button) => button.getAttribute("aria-selected") === "true"),
    );

    const select = (index: number) => {
      buttons.forEach((button, current) => {
        button.setAttribute("aria-selected", String(current === index));
        button.tabIndex = current === index ? 0 : -1;
        panels[current]!.hidden = current !== index;
      });
    };

    buttons.forEach((button, index) => {
      const onClick = () => select(index);
      const onKeyDown = (event: KeyboardEvent) => {
        let next: number;
        const rtl = group.ownerDocument.defaultView?.getComputedStyle(group).direction === "rtl";
        switch (event.key) {
          case "ArrowRight":
            next = (index + (rtl ? -1 : 1) + buttons.length) % buttons.length;
            break;
          case "ArrowLeft":
            next = (index + (rtl ? 1 : -1) + buttons.length) % buttons.length;
            break;
          case "Home":
            next = 0;
            break;
          case "End":
            next = buttons.length - 1;
            break;
          default:
            return;
        }
        event.preventDefault();
        select(next);
        buttons[next]!.focus();
      };
      button.addEventListener("click", onClick);
      button.addEventListener("keydown", onKeyDown);
      cleanups.push(() => {
        button.removeEventListener("click", onClick);
        button.removeEventListener("keydown", onKeyDown);
      });
    });

    select(initial);
    group.setAttribute("data-tabs-ready", "");
    revealAnchor.push((target) => {
      const index = panels.findIndex((panel) => panel.contains(target));
      const wasHidden = index >= 0 && Boolean(panels[index]!.hidden);
      if (index >= 0) select(index);
      return wasHidden;
    });
    cleanups.push(() => {
      select(initial);
      panels.forEach((panel) => {
        panel.hidden = false;
      });
      group.removeAttribute("data-tabs-ready");
    });
  }

  if (!revealAnchor.length) return () => {};
  const window = root.ownerDocument.defaultView;
  const onHashChange = () => {
    let hash = window?.location.hash.slice(1) ?? "";
    try {
      hash = decodeURIComponent(hash);
    } catch {
      return;
    }
    const target = hash && root.ownerDocument.getElementById(hash);
    if (!target || !root.contains(target)) return;
    let revealed = false;
    for (const reveal of revealAnchor) {
      if (reveal(target)) revealed = true;
    }
    // The browser cannot scroll to a heading while its panel is hidden.
    if (revealed) target.scrollIntoView?.();
  };
  onHashChange();
  window?.addEventListener("hashchange", onHashChange);
  cleanups.push(() => window?.removeEventListener("hashchange", onHashChange));

  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}
