"use client";

import { useEffect, useRef } from "react";
import { enhanceDisclosures } from "./disclosures.js";
import { enhanceTabs } from "./tabs.js";

export function TabsEnhancer({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const cleanupTabs = enhanceTabs(ref.current);
    const cleanupDisclosures = enhanceDisclosures(ref.current);
    return () => {
      cleanupTabs();
      cleanupDisclosures();
    };
  }, [html]);

  return (
    <div
      ref={ref}
      className="makit-prose prose max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
