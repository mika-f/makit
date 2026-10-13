"use client";

import { useEffect, useRef } from "react";
import { enhanceTabs } from "./tabs.js";

export function TabsEnhancer({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) return enhanceTabs(ref.current);
  }, [html]);

  return (
    <div
      ref={ref}
      className="makit-prose prose max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
