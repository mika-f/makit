/** Native details handle activation; enhance anchor navigation and printing. */
export function enhanceDisclosures(root: HTMLElement): () => void {
  const details = [...root.querySelectorAll<HTMLDetailsElement>("details[data-makit-toggle]")];
  if (!details.length) return () => {};
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
    // Open ancestors first, including nested accordions with separate names.
    for (const detail of details) {
      if (detail.contains(target) && !detail.open) {
        detail.open = true;
        revealed = true;
      }
    }
    if (revealed) target.scrollIntoView?.();
  };

  let printState: { detail: HTMLDetailsElement; open: boolean; name: string | null }[] | undefined;
  const beforePrint = () => {
    if (printState) return;
    printState = details.map((detail) => ({
      detail,
      open: detail.open,
      name: detail.getAttribute("name"),
    }));
    for (const detail of details) {
      detail.removeAttribute("name");
      detail.open = true;
    }
  };
  const afterPrint = () => {
    if (!printState) return;
    for (const { detail, open } of printState) detail.open = open;
    for (const { detail, name } of printState) {
      if (name !== null) detail.setAttribute("name", name);
    }
    printState = undefined;
  };

  onHashChange();
  window?.addEventListener("hashchange", onHashChange);
  window?.addEventListener("beforeprint", beforePrint);
  window?.addEventListener("afterprint", afterPrint);
  return () => {
    window?.removeEventListener("hashchange", onHashChange);
    window?.removeEventListener("beforeprint", beforePrint);
    window?.removeEventListener("afterprint", afterPrint);
    afterPrint();
  };
}
